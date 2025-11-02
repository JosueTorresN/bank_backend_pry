import { callSP } from '../config/db.js';

/**
 * Llama al SP para crear una nueva tarjeta en la base de datos.
 * @param {object} cardData - Objeto con los 9 parámetros del SP.
 * @returns {Promise<string>} El UUID de la nueva tarjeta.
 */
export const createCardInDb = async (cardData) => {
  // El orden de este array DEBE coincidir con el orden de los argumentos del SP
  const params = [
    cardData.usuario_id,
    cardData.tipo,
    cardData.numero_enmascarado,
    cardData.fecha_expiracion,
    cardData.cvv_hash,         // SP param: p_cvv_encriptado
    cardData.pin_hash,         // SP param: p_pin_encriptado
    cardData.moneda,
    cardData.limite_credito,
    cardData.saldo_actual
  ];

  try {
    const { rows } = await callSP('sp_cards_create', params);
    // Devuelve el UUID de la tarjeta creada
    return rows[0].sp_cards_create;

  } catch (error) {
    console.error('Error en sp_cards_create:', error.message);
    throw error;
  }
};