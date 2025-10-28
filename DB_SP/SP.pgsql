-- ####################################################################
-- #                       FUNCIÓN AUXILIAR                           #
-- ####################################################################

-- Función auxiliar Calcular Edad (NOW() => STABLE)
CREATE OR REPLACE FUNCTION calcular_edad(p_fecha_nacimiento DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN DATE_PART('year', AGE(NOW(), p_fecha_nacimiento))::INT;
END;
$$;

-- ####################################################################
-- #                      1. AUTENTICACIÓN Y OTP                      #
-- ####################################################################

-- 1. sp_auth_user_get_by_username_or_email
--   - No expone contrasena_hash
--   - SECURITY DEFINER + search_path fijo
CREATE OR REPLACE FUNCTION sp_auth_user_get_by_username_or_email(
  p_username_or_email TEXT
)
RETURNS TABLE (
  user_id UUID,
  rol UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.rol
  FROM   usuario u
  WHERE  u.usuario = p_username_or_email
      OR u.correo  = p_username_or_email;
END;
$$;

-- 2. sp_api_key_is_active
CREATE OR REPLACE FUNCTION sp_api_key_is_active(
  p_api_key_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_active BOOLEAN;
BEGIN
  SELECT activa INTO v_is_active
  FROM apiKey
  WHERE clave_hash = p_api_key_hash;

  RETURN COALESCE(v_is_active, FALSE);
END;
$$;

-- 3. sp_otp_create
CREATE OR REPLACE FUNCTION sp_otp_create(
  p_user_id UUID,
  p_proposito proposito_otp,
  p_expires_in_seconds INTEGER,
  p_codigo_hash TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_otp_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO otps (id, usuario_id, codigo_hash, proposito, fecha_expiracion)
  VALUES (
    v_otp_id,
    p_user_id,
    p_codigo_hash,
    p_proposito,
    NOW() + (p_expires_in_seconds || ' seconds')::INTERVAL
  );

  RETURN v_otp_id;
END;
$$;

-- 4. sp_otp_consume
--   - Consume sólo 1 OTP (el más reciente), evita afectar múltiples filas
CREATE OR REPLACE FUNCTION sp_otp_consume(
  p_user_id UUID,
  p_proposito proposito_otp,
  p_codigo_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_rowcount BIGINT;
BEGIN
  SELECT id INTO v_id
  FROM otps
  WHERE usuario_id = p_user_id
    AND proposito  = p_proposito
    AND codigo_hash = p_codigo_hash
    AND fecha_expiracion > NOW()
    AND fecha_consumido IS NULL
  ORDER BY fecha_creacion DESC
  LIMIT 1;

  IF v_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE otps
  SET fecha_consumido = NOW()
  WHERE id = v_id;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount = 1;
END;
$$;


-- ####################################################################
-- #                            2. USUARIOS                           #
-- ####################################################################

-- 5. sp_users_create
--   - Normaliza correo/usuario a minúsculas
--   - Valida edad/unicidad
--   - (Recomendado: controlar quién puede fijar p_rol)
CREATE OR REPLACE FUNCTION sp_users_create(
  p_tipo_identificacion UUID,
  p_identificacion VARCHAR,
  p_nombre VARCHAR,
  p_apellido VARCHAR,
  p_correo VARCHAR,
  p_telefono VARCHAR,
  p_usuario VARCHAR,
  p_contrasena_hash TEXT,
  p_rol UUID,
  p_fecha_nacimiento DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := gen_random_uuid();
  v_correo  TEXT := lower(p_correo);
  v_usuario TEXT := lower(p_usuario);
BEGIN
  -- Edad mínima
  IF calcular_edad(p_fecha_nacimiento) < 18 THEN
    RAISE EXCEPTION 'El usuario debe tener al menos 18 años de edad.';
  END IF;

  -- Unicidad (apoyarse en índices únicos en tabla)
  IF EXISTS (SELECT 1 FROM usuario WHERE identificacion = p_identificacion) THEN
    RAISE EXCEPTION 'Identificación ya registrada.';
  END IF;
  IF EXISTS (SELECT 1 FROM usuario WHERE lower(correo) = v_correo) THEN
    RAISE EXCEPTION 'Correo ya registrado.';
  END IF;
  IF EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = v_usuario) THEN
    RAISE EXCEPTION 'Nombre de usuario ya en uso.';
  END IF;

  INSERT INTO usuario (
    id, tipo_identificacion, identificacion, nombre, apellido, correo, telefono,
    usuario, contrasena_hash, rol
  )
  VALUES (
    v_user_id, p_tipo_identificacion, p_identificacion, p_nombre, p_apellido, v_correo,
    p_telefono, v_usuario, p_contrasena_hash, p_rol
  );

  RETURN v_user_id;
END;
$$;

-- 6. sp_users_get_by_identification
CREATE OR REPLACE FUNCTION sp_users_get_by_identification(
  p_identificacion VARCHAR
)
RETURNS TABLE (
  id UUID,
  nombre VARCHAR,
  apellido VARCHAR,
  correo VARCHAR,
  usuario VARCHAR,
  rol UUID
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.nombre, u.apellido, u.correo, u.usuario, u.rol
  FROM   usuario u
  WHERE  u.identificacion = p_identificacion;
END;
$$;

-- 7. sp_users_update
CREATE OR REPLACE FUNCTION sp_users_update(
  p_user_id UUID,
  p_nombre VARCHAR DEFAULT NULL,
  p_apellido VARCHAR DEFAULT NULL,
  p_correo VARCHAR DEFAULT NULL,
  p_usuario VARCHAR DEFAULT NULL,
  p_rol UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated BOOLEAN := FALSE;
  v_correo  TEXT := CASE WHEN p_correo  IS NULL THEN NULL ELSE lower(p_correo)  END;
  v_usuario TEXT := CASE WHEN p_usuario IS NULL THEN NULL ELSE lower(p_usuario) END;
  v_rowcount BIGINT;
BEGIN
  IF v_correo IS NOT NULL AND EXISTS (SELECT 1 FROM usuario WHERE lower(correo) = v_correo AND id <> p_user_id) THEN
    RAISE EXCEPTION 'El nuevo correo ya está en uso.';
  END IF;
  IF v_usuario IS NOT NULL AND EXISTS (SELECT 1 FROM usuario WHERE lower(usuario) = v_usuario AND id <> p_user_id) THEN
    RAISE EXCEPTION 'El nuevo nombre de usuario ya está en uso.';
  END IF;

  UPDATE usuario
  SET
    nombre            = COALESCE(p_nombre, nombre),
    apellido          = COALESCE(p_apellido, apellido),
    correo            = COALESCE(v_correo, correo),
    usuario           = COALESCE(v_usuario, usuario),
    rol               = COALESCE(p_rol, rol),
    fecha_actualizacion = NOW()
  WHERE id = p_user_id;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount = 1;
END;
$$;

-- 8. sp_users_delete
CREATE OR REPLACE FUNCTION sp_users_delete(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rowcount BIGINT;
BEGIN
  DELETE FROM usuario WHERE id = p_user_id;
  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount = 1;
END;
$$;

-- ####################################################################
-- #                            3. CUENTAS Y MOVS                     #
-- ####################################################################

-- 9. sp_accounts_create
CREATE OR REPLACE FUNCTION sp_accounts_create(
  p_usuario_id UUID,
  p_iban VARCHAR,
  p_alias VARCHAR,
  p_tipo UUID,
  p_moneda UUID,
  p_saldo_inicial NUMERIC(18,2),
  p_estado UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO cuenta (id, usuario_id, iban, alias, tipoCuenta, moneda, saldo, estado)
  VALUES (v_account_id, p_usuario_id, p_iban, p_alias, p_tipo, p_moneda, p_saldo_inicial, p_estado);

  RETURN v_account_id;
END;
$$;

-- 10. sp_accounts_get
CREATE OR REPLACE FUNCTION sp_accounts_get(
  p_owner_id UUID DEFAULT NULL,
  p_account_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  usuario_id UUID,
  iban VARCHAR,
  alias VARCHAR,
  tipoCuenta UUID,
  moneda UUID,
  saldo NUMERIC(18,2),
  estado UUID,
  fecha_creacion TIMESTAMP
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.usuario_id, c.iban, c.alias, c.tipoCuenta, c.moneda, c.saldo, c.estado, c.fecha_creacion
  FROM   cuenta c
  WHERE  (p_account_id IS NULL AND c.usuario_id = p_owner_id)
      OR (p_account_id IS NOT NULL AND c.id = p_account_id AND (p_owner_id IS NULL OR c.usuario_id = p_owner_id));
END;
$$;

-- 11. sp_accounts_set_status
CREATE OR REPLACE FUNCTION sp_accounts_set_status(
  p_account_id UUID,
  p_nuevo_estado UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo NUMERIC(18,2);
  v_cerrada_id UUID;
  v_rowcount BIGINT;
BEGIN
  SELECT id INTO v_cerrada_id FROM estadoCuenta WHERE nombre = 'Cerrada';

  -- Bloquear la fila de la cuenta
  SELECT saldo INTO v_saldo FROM cuenta WHERE id = p_account_id FOR UPDATE;

  IF v_saldo IS NULL THEN
    RAISE EXCEPTION 'Cuenta no encontrada.';
  END IF;

  IF p_nuevo_estado = v_cerrada_id AND v_saldo <> 0.00 THEN
    RAISE EXCEPTION 'No se puede cerrar una cuenta con saldo distinto de cero.';
  END IF;

  UPDATE cuenta
  SET estado = p_nuevo_estado, fecha_actualizacion = NOW()
  WHERE id = p_account_id;

  GET DIAGNOSTICS v_rowcount = ROW_COUNT;
  RETURN v_rowcount = 1;
END;
$$;

-- 12. sp_account_movements_list (normaliza paginación)
CREATE OR REPLACE FUNCTION sp_account_movements_list(
  p_account_id UUID,
  p_from_date TIMESTAMP DEFAULT NULL,
  p_to_date TIMESTAMP DEFAULT NULL,
  p_type UUID DEFAULT NULL,
  p_q TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  cuenta_id UUID,
  fecha TIMESTAMP,
  tipo UUID,
  descripcion VARCHAR,
  moneda UUID,
  monto NUMERIC(18,2),
  total_rows BIGINT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_page INT := GREATEST(1, p_page);
  v_page_size INT := LEAST(GREATEST(1, p_page_size), 200);
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.cuenta_id, m.fecha, m.tipo, m.descripcion, m.moneda, m.monto,
    COUNT(*) OVER() AS total_rows
  FROM movimientoCuenta m
  WHERE m.cuenta_id = p_account_id
    AND (p_from_date IS NULL OR m.fecha >= p_from_date)
    AND (p_to_date   IS NULL OR m.fecha <= p_to_date)
    AND (p_type      IS NULL OR m.tipo  = p_type)
    AND (p_q         IS NULL OR m.descripcion ILIKE '%' || p_q || '%')
  ORDER BY m.fecha DESC
  LIMIT v_page_size
  OFFSET (v_page - 1) * v_page_size;
END;
$$;

-- ####################################################################
-- #                         4. TRANSFERENCIAS                        #
-- ####################################################################

-- 13. sp_transfer_create_internal
--   - Bloquea origen y destino
--   - Valida moneda, monto, misma cuenta, propiedad
CREATE OR REPLACE FUNCTION sp_transfer_create_internal(
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount NUMERIC(18,2),
  p_currency UUID,
  p_description VARCHAR,
  p_user_id UUID
)
RETURNS TABLE (
  transfer_id UUID,
  receipt_number TEXT,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer_id UUID := gen_random_uuid();
  v_status TEXT := 'COMPLETED';
  v_saldo_origen NUMERIC(18,2);
  v_moneda_origen UUID;
  v_moneda_destino UUID;
  v_tipo_debito UUID;
  v_tipo_credito UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor a cero.';
  END IF;
  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'La cuenta origen y destino no pueden ser la misma.';
  END IF;

  SELECT id INTO v_tipo_debito  FROM tipoMovimientoCuenta WHERE nombre = 'Debito';
  SELECT id INTO v_tipo_credito FROM tipoMovimientoCuenta WHERE nombre = 'Crédito';

  -- Origen: validar propiedad y bloquear
  SELECT saldo, moneda INTO v_saldo_origen, v_moneda_origen
  FROM cuenta
  WHERE id = p_from_account_id AND usuario_id = p_user_id
  FOR UPDATE;

  IF v_saldo_origen IS NULL THEN
    RAISE EXCEPTION 'Cuenta origen no encontrada o no pertenece al usuario.';
  END IF;

  -- Destino: bloquear y obtener moneda
  SELECT moneda INTO v_moneda_destino
  FROM cuenta
  WHERE id = p_to_account_id
  FOR UPDATE;

  IF v_moneda_destino IS NULL THEN
    RAISE EXCEPTION 'La cuenta destino no existe.';
  END IF;

  IF v_moneda_origen <> p_currency OR v_moneda_destino <> p_currency THEN
    RAISE EXCEPTION 'La moneda no coincide con la(s) cuenta(s).';
  END IF;

  IF v_saldo_origen < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente en la cuenta origen.';
  END IF;

  -- Débito origen
  UPDATE cuenta
  SET saldo = saldo - p_amount, fecha_actualizacion = NOW()
  WHERE id = p_from_account_id;

  INSERT INTO movimientoCuenta (id, cuenta_id, fecha, tipo, descripcion, moneda, monto)
  VALUES (gen_random_uuid(), p_from_account_id, NOW(), v_tipo_debito,
          'Transferencia enviada: ' || COALESCE(p_description,''),
          p_currency, p_amount);

  -- Crédito destino
  UPDATE cuenta
  SET saldo = saldo + p_amount, fecha_actualizacion = NOW()
  WHERE id = p_to_account_id;

  INSERT INTO movimientoCuenta (id, cuenta_id, fecha, tipo, descripcion, moneda, monto)
  VALUES (gen_random_uuid(), p_to_account_id, NOW(), v_tipo_credito,
          'Transferencia recibida: ' || COALESCE(p_description,''),
          p_currency, p_amount);

  RETURN QUERY
    SELECT v_transfer_id, 'REC-' || to_char(NOW(), 'YYYYMMDDHHMISS'), v_status;
END;
$$;

-- ####################################################################
-- #                           5. TARJETAS                            #
-- ####################################################################

-- 14. sp_cards_create
CREATE OR REPLACE FUNCTION sp_cards_create(
  p_usuario_id UUID,
  p_tipo UUID,
  p_numero_enmascarado VARCHAR,
  p_fecha_expiracion CHAR,
  p_cvv_encriptado TEXT,
  p_pin_encriptado TEXT,
  p_moneda UUID,
  p_limite_credito NUMERIC(18,2),
  p_saldo_actual NUMERIC(18,2)
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO tarjeta (id, usuario_id, tipo, numero_enmascarado, fecha_expiracion,
                       cvv_hash, pin_hash, moneda, limite_credito, saldo_actual)
  VALUES (v_card_id, p_usuario_id, p_tipo, p_numero_enmascarado, p_fecha_expiracion,
          p_cvv_encriptado, p_pin_encriptado, p_moneda, p_limite_credito, p_saldo_actual);

  RETURN v_card_id;
END;
$$;

-- 15. sp_cards_get
CREATE OR REPLACE FUNCTION sp_cards_get(
  p_owner_id UUID DEFAULT NULL,
  p_card_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  usuario_id UUID,
  tipo UUID,
  numero_enmascarado VARCHAR,
  fecha_expiracion CHAR,
  moneda UUID,
  limite_credito NUMERIC(18,2),
  saldo_actual NUMERIC(18,2)
)
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.usuario_id, t.tipo, t.numero_enmascarado, t.fecha_expiracion,
         t.moneda, t.limite_credito, t.saldo_actual
  FROM tarjeta t
  WHERE (p_card_id IS NULL  AND t.usuario_id = p_owner_id)
     OR (p_card_id IS NOT NULL AND t.id = p_card_id AND (p_owner_id IS NULL OR t.usuario_id = p_owner_id));
END;
$$;

-- 16. sp_card_movements_list (normaliza paginación)
CREATE OR REPLACE FUNCTION sp_card_movements_list(
  p_card_id UUID,
  p_from_date TIMESTAMP DEFAULT NULL,
  p_to_date TIMESTAMP DEFAULT NULL,
  p_type UUID DEFAULT NULL,
  p_q TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  tarjeta_id UUID,
  fecha TIMESTAMP,
  tipo UUID,
  descripcion VARCHAR,
  moneda UUID,
  monto NUMERIC(18,2),
  total_rows BIGINT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_page INT := GREATEST(1, p_page);
  v_page_size INT := LEAST(GREATEST(1, p_page_size), 200);
BEGIN
  RETURN QUERY
  SELECT
    m.id, m.tarjeta_id, m.fecha, m.tipo, m.descripcion, m.moneda, m.monto,
    COUNT(*) OVER() AS total_rows
  FROM movimientoTarjeta m
  WHERE m.tarjeta_id = p_card_id
    AND (p_from_date IS NULL OR m.fecha >= p_from_date)
    AND (p_to_date   IS NULL OR m.fecha <= p_to_date)
    AND (p_type      IS NULL OR m.tipo  = p_type)
    AND (p_q         IS NULL OR m.descripcion ILIKE '%' || p_q || '%')
  ORDER BY m.fecha DESC
  LIMIT v_page_size
  OFFSET (v_page - 1) * v_page_size;
END;
$$;

-- 17. sp_card_movement_add
--   - Valida límite, signos y tipos básicos (Compra/ Pago)
CREATE OR REPLACE FUNCTION sp_card_movement_add(
  p_card_id UUID,
  p_fecha TIMESTAMP,
  p_tipo UUID,
  p_descripcion VARCHAR,
  p_moneda UUID,
  p_monto NUMERIC(18,2)
)
RETURNS TABLE (
  movement_id UUID,
  nuevo_saldo_tarjeta NUMERIC(18,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_movement_id UUID := gen_random_uuid();
  v_nuevo_saldo NUMERIC(18,2);
  v_limite_credito NUMERIC(18,2);
  v_saldo_actual NUMERIC(18,2);
  v_moneda_tarjeta UUID;
  v_tipo_compra UUID;
  v_tipo_pago   UUID;
BEGIN
  SELECT id INTO v_tipo_compra FROM tipoMovimientoTarjeta WHERE nombre = 'Compra';
  SELECT id INTO v_tipo_pago   FROM tipoMovimientoTarjeta WHERE nombre = 'Pago';

  SELECT limite_credito, saldo_actual, moneda
  INTO   v_limite_credito, v_saldo_actual, v_moneda_tarjeta
  FROM   tarjeta
  WHERE  id = p_card_id
  FOR UPDATE;

  IF v_limite_credito IS NULL THEN
    RAISE EXCEPTION 'Tarjeta no encontrada.';
  END IF;

  IF v_moneda_tarjeta <> p_moneda THEN
    RAISE EXCEPTION 'La moneda del movimiento no coincide con la moneda de la tarjeta.';
  END IF;

  -- Política de signos por tipo
  IF p_tipo = v_tipo_compra AND p_monto <= 0 THEN
    RAISE EXCEPTION 'El monto de una compra debe ser positivo.';
  END IF;
  IF p_tipo = v_tipo_pago AND p_monto >= 0 THEN
    RAISE EXCEPTION 'El monto de un pago debe ser negativo (disminuye saldo utilizado).';
  END IF;

  -- Validación de límite sólo para compras
  IF p_tipo = v_tipo_compra AND (v_saldo_actual + p_monto) > v_limite_credito THEN
    RAISE EXCEPTION 'Límite de crédito excedido. Saldo proyectado: %', v_saldo_actual + p_monto;
  END IF;

  INSERT INTO movimientoTarjeta (id, tarjeta_id, fecha, tipo, descripcion, moneda, monto)
  VALUES (v_movement_id, p_card_id, p_fecha, p_tipo, p_descripcion, p_moneda, p_monto);

  UPDATE tarjeta
  SET saldo_actual = v_saldo_actual + p_monto, fecha_actualizacion = NOW()
  WHERE id = p_card_id
  RETURNING saldo_actual INTO v_nuevo_saldo;

  RETURN QUERY
    SELECT v_movement_id, v_nuevo_saldo;
END;
$$;

-- ####################################################################
-- #                      6. VALIDACIÓN Y AUDITORÍA                   #
-- ####################################################################

-- 18. sp_bank_validate_account
--   - Asegura única fila (asuma constraint único en IBAN)
CREATE OR REPLACE FUNCTION sp_bank_validate_account(
  p_iban VARCHAR
)
RETURNS TABLE (
  "exists" BOOLEAN,
  owner_name TEXT,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN := FALSE;
  v_owner_name TEXT := NULL;
  v_owner_id UUID := NULL;
BEGIN
  SELECT TRUE,
         u.nombre || ' ' || u.apellido,
         u.id
  INTO   v_exists, v_owner_name, v_owner_id
  FROM   cuenta c
  JOIN   usuario u ON c.usuario_id = u.id
  WHERE  c.iban = p_iban
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, NULL::UUID;
  ELSE
    RETURN QUERY SELECT v_exists, v_owner_name, v_owner_id;
  END IF;
END;
$$;

-- 19. sp_audit_log
CREATE OR REPLACE FUNCTION sp_audit_log(
  p_actor_user_id UUID DEFAULT NULL,
  p_accion VARCHAR DEFAULT NULL,
  p_detalles_json JSONB DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id INTEGER;
BEGIN
  INSERT INTO auditoria (usuario_id, accion, detalles)
  VALUES (p_actor_user_id, p_accion, p_detalles_json)
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

-- 20. sp_audit_list_by_user
CREATE OR REPLACE FUNCTION sp_audit_list_by_user(
  p_user_id UUID
)
RETURNS TABLE (
  id INTEGER,
  usuario_id UUID,
  accion VARCHAR,
  detalles JSONB,
  fecha TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.usuario_id, a.accion, a.detalles, a.fecha
  FROM   auditoria a
  WHERE  a.usuario_id = p_user_id
  ORDER BY a.fecha DESC;
END;
$$;

