-- DDL SCRIPT (PostgreSQL)

-- ====================================================================
-- Tablas de Configuración/Catálogos
-- ====================================================================

-- Rol
CREATE TABLE rol (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Admin, Cliente
    descripcion VARCHAR(255)
);

-- Tipo de Identificación
CREATE TABLE tipoIdentificacion (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Nacional, DIMEX, Pasaporte
    descripcion VARCHAR(255)
);

-- Tipo de Cuenta
CREATE TABLE tipoCuenta (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Ahorros, Corriente
    descripcion VARCHAR(255)
);

-- Moneda
CREATE TABLE moneda (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL, -- Colones, Dólares
    iso CHAR(3) UNIQUE NOT NULL -- CRC, USD
);

-- Estado de Cuenta
CREATE TABLE estadoCuenta (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Activa, Bloqueada, Cerrada
    descripcion VARCHAR(255)
);

-- Tipo de Movimiento de Cuenta
CREATE TABLE tipoMovimientoCuenta (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Crédito, Debito
    descripcion VARCHAR(255)
);

-- Tipo de Tarjeta
CREATE TABLE tipoTarjeta (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Crédito, Débito (asumiendo de la descripción)
    descripcion VARCHAR(255)
);

-- Tipo de Movimiento de Tarjeta
CREATE TABLE tipoMovimientoTarjeta (
    id UUID PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL, -- Compra, Pago
    descripcion VARCHAR(255)
);

-- ====================================================================
-- Tablas Principales
-- ====================================================================

-- Usuario
CREATE TABLE usuario (
    id UUID PRIMARY KEY,
    tipo_identificacion UUID NOT NULL REFERENCES tipoIdentificacion(id), 
    identificacion VARCHAR(100) UNIQUE NOT NULL, 
    nombre VARCHAR(100) NOT NULL, 
    apellido VARCHAR(100) NOT NULL, 
    correo VARCHAR(255) UNIQUE NOT NULL, 
    telefono VARCHAR(20), 
    usuario VARCHAR(100) UNIQUE NOT NULL, 
    contrasena_hash TEXT NOT NULL, -- Se usa TEXT para almacenar el hash (bcrypt)
    rol UUID NOT NULL REFERENCES rol(id), 
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cuenta
CREATE TABLE cuenta (
    id UUID PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES usuario(id), 
    iban VARCHAR(34) UNIQUE NOT NULL, 
    alias VARCHAR(100), 
    tipoCuenta UUID NOT NULL REFERENCES tipoCuenta(id), 
    moneda UUID NOT NULL REFERENCES moneda(id), 
    saldo DECIMAL(18, 2) NOT NULL DEFAULT 0.00, 
    estado UUID NOT NULL REFERENCES estadoCuenta(id), 
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP 
);

-- Tarjeta
CREATE TABLE tarjeta (
    id UUID PRIMARY KEY, 
    usuario_id UUID NOT NULL REFERENCES usuario(id), 
    tipo UUID NOT NULL REFERENCES tipoTarjeta(id), 
    numero_enmascarado VARCHAR(25) UNIQUE NOT NULL, 
    fecha_expiracion CHAR(5) NOT NULL, -- MM/YY 
    cvv_hash TEXT NOT NULL, 
    pin_hash TEXT NOT NULL, 
    moneda UUID NOT NULL REFERENCES moneda(id), 
    limite_credito DECIMAL(18, 2) NOT NULL, 
    saldo_actual DECIMAL(18, 2) NOT NULL DEFAULT 0.00, -- Saldo utilizado o disponible 
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP 
);

-- Movimiento de Cuenta
CREATE TABLE movimientoCuenta (
    id UUID PRIMARY KEY, 
    cuenta_id UUID NOT NULL REFERENCES cuenta(id), 
    fecha TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    tipo UUID NOT NULL REFERENCES tipoMovimientoCuenta(id), 
    descripcion VARCHAR(255), 
    moneda UUID NOT NULL REFERENCES moneda(id), 
    monto DECIMAL(18, 2) NOT NULL 
);

-- Movimiento de Tarjeta
CREATE TABLE movimientoTarjeta (
    id UUID PRIMARY KEY, 
    tarjeta_id UUID NOT NULL REFERENCES tarjeta(id), -- Corregido de cuenta_id a tarjeta_id 
    fecha TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP, 
    tipo UUID NOT NULL REFERENCES tipoMovimientoTarjeta(id), 
    descripcion VARCHAR(255), 
    moneda UUID NOT NULL REFERENCES moneda(id), 
    monto DECIMAL(18, 2) NOT NULL 
);

-- OTPs
CREATE TYPE proposito_otp AS ENUM ('password_reset', 'card_details'); -- Definición del ENUM 

CREATE TABLE otps (
    id UUID PRIMARY KEY, 
    usuario_id UUID NOT NULL REFERENCES usuario(id), 
    codigo_hash TEXT NOT NULL, 
    proposito proposito_otp NOT NULL, 
    fecha_expiracion TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    fecha_consumido TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL, -- Nullable 
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP 
);

-- API Key
CREATE TABLE apiKey (
    id UUID PRIMARY KEY, 
    clave_hash TEXT UNIQUE NOT NULL, 
    etiqueta VARCHAR(255), 
    activa BOOLEAN NOT NULL DEFAULT TRUE, 
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP 
);

-- Auditoria (Puntos Extra)
CREATE TABLE auditoria (
    id SERIAL PRIMARY KEY, -- Identificador incremental 
    usuario_id UUID REFERENCES usuario(id), 
    accion VARCHAR(100) NOT NULL, -- LOGIN, CAMBIO ESTADO CUENTA 
    detalles JSONB, -- JSON 
    fecha TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP 
);