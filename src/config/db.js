import 'dotenv/config'; // Carga las variables de entorno
import { Pool } from 'pg'; // <-- 1. CAMBIO: 'require' se reemplaza por 'import'

// Configuración de la conexión a la base de datos
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
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
 * Función para ejecutar consultas SQL directamente.
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Función centralizada para llamar a cualquier Stored Procedure (SP).
 * Asume que el SP debe ser llamado con un SELECT.
 * * @param {string} spName - Nombre del Procedimiento Almacenado (ej: sp_auth_user_get_by_username_or_email)
 * @param {Array<any>} params - Array de parámetros para el SP
 * @returns {Promise<import('pg').QueryResult>} El resultado de la consulta.
 */
export const callSP = (spName, params = []) => {
    // Genera el string de parámetros ($1, $2, $3, ...) basado en la cantidad de params
    const paramPlaceholders = params.map((_, index) => `$${index + 1}`).join(', ');
    
    // Construye la consulta para llamar al SP. 
    // Los SPs de PostgreSQL que retornan datos a menudo se llaman con SELECT.
    const spQuery = `SELECT * FROM ${spName}(${paramPlaceholders})`;
    
    console.log(`Ejecutando SP: ${spQuery} con parámetros: ${params}`);

    return pool.query(spQuery, params);
};

// Exporta el pool directamente si algo más necesita usarlo
export { pool };

// --- 2. CAMBIO: 'module.exports' se reemplaza por 'export' ---
// (He movido los 'export' para que estén en línea con cada función,
//  lo cual es más común en ESM, pero también podrías hacer esto al final)
/*
export {
  query,
  callSP, 
  pool, 
};
*/