require('dotenv').config(); // Carga las variables de entorno
const { Pool } = require('pg');

// Configuración de la conexión a la base de datos
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10), // Asegura que el puerto sea un número
  max: 20, // Máximo de clientes en el pool
  idleTimeoutMillis: 30000, // Tiempo de inactividad
  connectionTimeoutMillis: 2000, // Tiempo de espera para la conexión
};

const pool = new Pool(dbConfig);

// Mensaje de confirmación al conectar
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error al conectar con la base de datos:', err.stack);
  }
  console.log(`Base de datos conectada exitosamente a: ${dbConfig.host}:${dbConfig.port}`);
  release();
});

/**
 * Exportamos un objeto con una función 'query'.
 * Esto nos permite centralizar cómo ejecutamos las consultas
 * y llamar a los Stored Procedures (SPs) requeridos[cite: 56].
 *
 * Ejemplo de uso en un controlador:
 * const db = require('../config/db');
 * const { rows } = await db.query('SELECT * FROM sp_auth_user_get_by_username_or_email($1)', [username]);
 */
module.exports = {
  query: (text, params) => pool.query(text, params),
  pool, // Exporta el pool si necesitas transacciones
};