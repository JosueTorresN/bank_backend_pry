import bcrypt from 'bcrypt';
import crypto from 'crypto'; // Para generación segura de números
import { createCardInDb, getCardsFromDb, getCardMovementsFromDb, addCardMovementInDb, getEncryptedCardDetailsFromDb } from '../db.controllers/card.db.controller.js';
import { createOtp, consumeOtp } from '../db.controllers/auth.db.controller.js';
import { encrypt, decrypt } from '../utils/crypto.service.js';

const SALT_ROUNDS = 10;
const TIPO_COMPRA_ID = '70000000-0000-0000-0000-000000000001';
const TIPO_PAGO_ID   = '70000000-0000-0000-0000-000000000002';
// 80000000-0000-0000-0000-000000000001 Credito
// 80000000-0000-0000-0000-000000000002 Debito
// --- Funciones de Generación (Helper functions) ---

// Simula la generación de un número de tarjeta (ej: Visa)
const generateCardNumber = () => {
  // '4' (Visa) + 15 dígitos aleatorios
  return '4' + Array.from({ length: 15 }, () => crypto.randomInt(0, 9)).join('');
};

// Genera una fecha de expiración (ej: 3 años desde hoy)
const generateExpDate = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 3);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  return `${month}/${year}`; // Formato MM/YY
};

// Genera un CVV de 3 dígitos
const generateCvv = () => crypto.randomInt(100, 999).toString();
// Genera un PIN de 4 dígitos
const generatePin = () => crypto.randomInt(1000, 9999).toString();
// Enmascara el número
const maskCardNumber = (number) => `************${number.slice(-4)}`;

// --- Controlador Principal ---
/**
 * Controlador para crear una nueva tarjeta.
 * Se encarga de la generación y hasheo de datos sensibles.
 */
const createCard = async (req, res, next) => {
  try {
    // ... (pasos 1-4: obtener datos, generar CVV, PIN, etc.)
    const { tipo, moneda } = req.body;
    const usuario_id = req.user.id;
    const cardNumber = generateCardNumber();
    const cvv = generateCvv();
    const pin = generatePin();
    const expDate = generateExpDate();

    // 5. Lógica de Negocio: ¡CIFRAR en lugar de Hashear!
    // const cvv_hash = await bcrypt.hash(cvv, SALT_ROUNDS); // <- NO USAR ESTO
    // const pin_hash = await bcrypt.hash(pin, SALT_ROUNDS); // <- NO USAR ESTO

    const cvv_encrypted = encrypt(cvv);
    const pin_encrypted = encrypt(pin);

    // 6. Ensamblar los datos para el SP
    const cardData = {
      usuario_id: usuario_id,
      tipo: tipo,
      numero_enmascarado: maskCardNumber(cardNumber),
      fecha_expiracion: expDate,
      cvv_hash: cvv_encrypted,   // El SP lo recibe en p_cvv_encriptado
      pin_hash: pin_encrypted,   // El SP lo recibe en p_pin_encriptado
      moneda: moneda,
      limite_credito: 0.00,
      saldo_actual: 0.00
    };
    
    // ... (pasos 7-8: llamar a createCardInDb y enviar respuesta)
    const newCardId = await createCardInDb(cardData);
    res.success(201, {
      message: 'Tarjeta creada exitosamente.',
      cardId: newCardId,
      numeroEnmascarado: cardData.numero_enmascarado,
      fechaExpiracion: cardData.fecha_expiracion
    });

  } catch (error) {
    next(error); 
  }
};

/**
 * Controlador para obtener TODAS las tarjetas de un usuario.
 * Se accede vía: GET /api/v1/cards?ownerId=...
 * Aplica lógica de seguridad: "solo admin o cliente dueño".
 */
const getCards = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { ownerId } = req.query;        // ID del dueño (de la query string)
    const loggedInUser = req.user;        // Usuario logueado (del JWT)

    // let targetOwnerId;

    // // 2. Lógica de Negocio y Seguridad
    // const isAdmin = loggedInUser.role === ADMIN_ROL_ID;

    // if (isAdmin) {
    //   // Es admin: DEBE especificar a quién quiere ver.
    //   if (!ownerId) {
    //     const error = new Error('Los administradores deben especificar un "ownerId" en la query.');
    //     error.statusCode = 400; // 400 Bad Request
    //     return next(error);
    //   }
    //   targetOwnerId = ownerId; // El admin puede ver al usuario que solicitó

    // } else {
    //   // No es admin: SOLO puede ver sus propias tarjetas.
    //   // Ignoramos 'ownerId' por seguridad y usamos el del token.
    //   targetOwnerId = loggedInUser.id;
    // }
    
    // 3. Llamar a la capa de base de datos
    // Pasamos el targetOwnerId y 'null' para cardId para que traiga todas.
    // const cards = await getCardsFromDb(targetOwnerId, null);
    const cards = await getCardsFromDb(loggedInUser.id, null);

    // 4. Enviar respuesta exitosa
    // El SP devuelve un array. Si no tiene tarjetas, será un array vacío [].
    res.success(200, cards);

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para obtener UNA tarjeta específica por su ID.
 * Se accede vía: GET /api/v1/cards/:id
 * Aplica lógica de seguridad: "solo admin o cliente dueño".
 */
const getCardById = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { id: cardId } = req.params;     // ID de la tarjeta (de la URL)
    // const loggedInUser = req.user;        // Usuario logueado (del JWT)
    const loggedInUser = req.user.id;

    // 2. Lógica de Autorización: "solo admin o cliente dueño"
    // const isAdmin = loggedInUser.role === ADMIN_ROL_ID;
    
    // // Si es admin, pasamos ownerId = null (para que el SP no filtre por dueño).
    // // Si NO es admin, pasamos el loggedInUser.id (para que el SP verifique que es el dueño).
    // const ownerId = isAdmin ? null : loggedInUser.id;

    // 3. Llamar a la capa de base de datos
    // Esta vez, proveemos AMBOS parámetros al SP.
    // const cards = await getCardsFromDb(ownerId, cardId);
    const cards = await getCardsFromDb(loggedInUser, cardId);

    // 4. Manejar "No Encontrado"
    // Si el array está vacío, significa que:
    // a) La tarjeta no existe (404).
    // b) La tarjeta existe, pero no pertenece a este usuario (403).
    // En ambos casos, 404 es la respuesta más segura.
    if (cards.length === 0) {
      const error = new Error('Tarjeta no encontrada o no tienes permiso para verla.');
      error.statusCode = 404;
      return next(error);
    }

    // 5. Enviar respuesta exitosa
    // El SP devuelve un array, pero solo queremos el primer (y único) elemento.
    res.success(200, cards[0]);

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para obtener los movimientos de una tarjeta.
 * Aplica lógica de "solo admin o cliente dueño" y maneja filtros/paginación.
 */
const getCardMovements = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { cardId } = req.params;     // ID de la tarjeta (de la URL)
    const loggedInUser = req.user;     // Usuario logueado (del JWT)

    // 2. Lógica de Autorización: "solo admin o cliente dueño"
    // Reutilizamos la lógica de getCardById para validar permisos.
    // const isAdmin = loggedInUser.role === ADMIN_ROL_ID;
    // const ownerId = isAdmin ? null : loggedInUser.id;
    const ownerId = loggedInUser.id;
    
    // Verificamos si la tarjeta existe Y si el usuario tiene permiso para verla
    const authorizedCards = await getCardsFromDb(ownerId, cardId);
    
    if (authorizedCards.length === 0) {
      const error = new Error('Tarjeta no encontrada o no tienes permiso para verla.');
      error.statusCode = 404;
      return next(error);
    }

    // 3. Parsear Filtros y Paginación de la Query String
    const { fromDate, toDate, type, q } = req.query;
    const page = parseInt(req.query.page || '1', 10);
    const pageSize = parseInt(req.query.pageSize || '10', 10);

    // 4. Llamar a la capa de base de datos
    const rows = await getCardMovementsFromDb(cardId, {
      fromDate, toDate, type, q, page, pageSize
    });

    // 5. Formatear Respuesta de Paginación
    if (rows.length === 0) {
      return res.success(200, {
        pagination: { totalItems: 0, totalPages: 0, currentPage: page, pageSize },
        data: []
      });
    }

    // El SP nos da 'total_rows' en CADA fila. Lo tomamos de la primera.
    const totalItems = parseInt(rows[0].total_rows, 10);
    const totalPages = Math.ceil(totalItems / pageSize);

    // Limpiamos la columna 'total_rows' de los datos que enviamos al cliente
    const data = rows.map(r => {
      delete r.total_rows;
      return r;
    });

    // 6. Enviar respuesta exitosa
    res.success(200, {
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        pageSize
      },
      data
    });

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para agregar un movimiento a una tarjeta (Compra o Pago).
 * Lógica de negocio:
 * 1. Solo admin o dueño pueden acceder.
 * 2. Solo admin puede registrar 'Compras'.
 * 3. Cliente/Dueño solo puede registrar 'Pagos'.
 */
const addCardMovement = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { cardId } = req.params;
    const loggedInUser = req.user;
    const { tipo, descripcion, moneda, monto } = req.body;

    // 2. Autorización (Paso 1: Dueño o Admin)
    // const isAdmin = loggedInUser.role === ADMIN_ROL_ID || null;
    // const ownerId = isAdmin ? null : loggedInUser.id;
    const ownerId = loggedInUser.id;
    
    // Reutilizamos getCardsFromDb para validar permisos
    const authorizedCards = await getCardsFromDb(ownerId, cardId);
    if (authorizedCards.length === 0) {
      const error = new Error('Tarjeta no encontrada o no tienes permiso.');
      error.statusCode = 404;
      return next(error);
    }
    const card = authorizedCards[0]; // Guardamos la info de la tarjeta

    // 3. Autorización (Paso 2: Lógica de Negocio)
    // if (!isAdmin && tipo !== TIPO_PAGO_ID) {
    //   const error = new Error('Acceso denegado. Los usuarios solo pueden registrar pagos en sus tarjetas.');
    //   error.statusCode = 403; // 403 Forbidden
    //   return next(error);
    // }

    // 4. Validación de Entrada (del SP)
    if (!tipo || !descripcion || !moneda || !monto) {
        const error = new Error('Faltan campos requeridos: tipo, descripcion, moneda, monto.');
        error.statusCode = 400;
        return next(error);
    }
    
    const numericAmount = parseFloat(monto);

    if (tipo === TIPO_PAGO_ID && numericAmount >= 0) {
      const error = new Error('El monto de un pago debe ser un número negativo (ej: -100.00).');
      error.statusCode = 400;
      return next(error);
    }
    if (tipo === TIPO_COMPRA_ID && numericAmount <= 0) {
      const error = new Error('El monto de una compra debe ser un número positivo.');
      error.statusCode = 400;
      return next(error);
    }
    if (card.moneda !== moneda) {
      const error = new Error('La moneda del movimiento no coincide con la moneda de la tarjeta.');
      error.statusCode = 400;
      return next(error);
    }

    // 5. Llamar a la capa de base de datos
    const result = await addCardMovementInDb(
      cardId,
      new Date(), // El servidor SIEMPRE define la fecha
      tipo,
      descripcion,
      moneda,
      numericAmount
    );

    // 6. Enviar respuesta exitosa
    res.success(201, {
      message: 'Movimiento registrado exitosamente.',
      ...result // Contiene { movement_id, nuevo_saldo_tarjeta }
    });

  } catch (error) {
    // 7. Manejar Errores de Negocio (del RAISE EXCEPTION)
    if (error.message.includes('Límite de crédito excedido')) {
      error.statusCode = 409; // 409 Conflict
    } else if (error.message.includes('Tarjeta no encontrada')) {
      error.statusCode = 404; // Not Found
    } else if (error.message.includes('moneda no coincide')) {
      error.statusCode = 400; // Bad Request
    }
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para solicitar un OTP para ver PIN/CVV.
 * Lógica de negocio: SOLO EL DUEÑO puede hacer esto.
 */
const requestPinCvvOtp = async (req, res, next) => {
  try {
    // 1. Obtener datos de la solicitud
    const { cardId } = req.params;     // ID de la tarjeta (de la URL)
    const loggedInUser = req.user;     // Usuario logueado (del JWT)

    // 2. Lógica de Autorización: "SOLO DUEÑO"
    // Los admins no pueden ver el PIN/CVV de un usuario.
    const authorizedCards = await getCardsFromDb(loggedInUser.id, cardId);
    
    if (authorizedCards.length === 0) {
      // 404 es más seguro que 403. No revela si la tarjeta existe.
      const error = new Error('Tarjeta no encontrada o no tienes permiso.');
      error.statusCode = 404;
      return next(error);
    }

    // 3. Generar un OTP (código numérico)
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // 4. Hashear con SHA256 (para que sp_otp_consume funcione)
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    
    // 5. Definir parámetros del OTP
    // ¡ASEGÚRATE DE AÑADIR 'ver_pin_cvv' A TU ENUM 'proposito_otp' EN LA BD!
    const otpPurpose = 'card_details'; 
    const expiresInSeconds = 300; // 5 minutos

    // 6. Guardar el HASH del OTP en la base de datos (reutilizando el controlador de auth)
    await createOtp(
      loggedInUser.id,
      otpPurpose,
      expiresInSeconds,
      hashedOtp
    );

    // 7. [PENDIENTE] Enviar el OTP por email/SMS
    console.log(`--- SIMULACIÓN DE EMAIL/SMS ---`);
    console.log(`Enviando OTP a usuario: ${loggedInUser.id}`);
    console.log(`Código (no hasheado): ${otp}`);
    console.log(`-------------------------------`);
    
    res.success(200, { 
      message: 'Se ha enviado un código OTP para la visualización.'
    });
    
  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

/**
 * Controlador para verificar OTP y visualizar PIN/CVV.
 * Lógica de negocio: SOLO EL DUEÑO puede hacer esto.
 */
const viewCardDetails = async (req, res, next) => {
   const OTP_PURPOSE_PIN = 'card_details';
  try {
    // 1. Obtener datos
    const { cardId } = req.params;
    const { otp } = req.body;
    const loggedInUser = req.user;

    if (!otp) {
      const error = new Error('El campo "otp" es requerido.');
      error.statusCode = 400;
      return next(error);
    }

    // 2. Hashear el OTP para verificarlo
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 3. Consumir el OTP (Reutilizando el controlador de auth)
    const isOtpValid = await consumeOtp(
      loggedInUser.id,
      OTP_PURPOSE_PIN,
      hashedOtp
    );

    if (!isOtpValid) {
      const error = new Error('OTP no válido, expirado o ya fue usado.');
      error.statusCode = 400;
      return next(error);
    }

    // 4. OTP VÁLIDO: Obtener datos cifrados (valida dueño)
    const sensitiveData = await getEncryptedCardDetailsFromDb(cardId, loggedInUser.id);
    if (!sensitiveData) {
      const error = new Error('No se pudieron obtener los datos de la tarjeta.');
      error.statusCode = 404; // No encontrado o no es dueño
      return next(error);
    }

    // 5. Descifrar los datos
    const pin = decrypt(sensitiveData.pin_encrypted);
    const cvv = decrypt(sensitiveData.cvv_encrypted);

    // 6. Enviar respuesta exitosa
    res.success(200, {
      message: 'Detalles recuperados. Esta información es temporal.',
      pin,
      cvv
    });

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

export default {
  createCard,
  getCards,
  getCardById,
  getCardMovements,
  addCardMovement,
  requestPinCvvOtp,
  viewCardDetails
};