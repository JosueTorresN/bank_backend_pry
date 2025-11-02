import { callSP } from '../config/db.js';

/**
 * Llama al SP para crear una transferencia interna.
 * @param {object} transferData - Objeto con los 6 parámetros del SP.
 * @returns {Promise<object>} Objeto con transfer_id, receipt_number y status.
 */
export const createInternalTransferInDb = async (transferData) => {
  // El orden de este array DEBE coincidir con el orden de los argumentos del SP
  const params = [
    transferData.fromAccountId,
    transferData.toAccountId,
    transferData.amount,
    transferData.currency,
    transferData.description,
    transferData.userId // ID del usuario (del JWT) que ejecuta la transferencia
  ];

  try {
    const { rows } = await callSP('sp_transfer_create_internal', params);
    
    // El SP devuelve una fila con los detalles de la transferencia completada
    return rows[0];

  } catch (error) {
    // Si el SP lanza un RAISE EXCEPTION, lo relanzamos
    // para que el controlador principal lo maneje.
    console.error('Error en sp_transfer_create_internal:', error.message);
    throw error;
  }
};