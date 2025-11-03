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

/**
 * Llama al SP para obtener una o más tarjetas.
 * - Si se provee cardId, busca esa tarjeta.
 * - Si se provee ownerId, filtra por dueño.
 * @param {string | null} ownerId - El UUID del dueño (opcional).
 * @param {string | null} cardId - El UUID de la tarjeta (opcional).
 * @returns {Promise<Array<object>>} Un array de tarjetas (puede estar vacío).
 */
export const getCardsFromDb = async (ownerId = null, cardId = null) => {
  try {
    const { rows } = await callSP(
      'sp_cards_get',
      [ownerId, cardId]
    );
    
    // Devuelve el array de tarjetas (no devuelve datos sensibles como CVV o PIN)
    return rows;

  } catch (error) {
    console.error('Error en sp_cards_get:', error.message);
    throw new Error('Error al obtener tarjetas de la base de datos.');
  }
};

/**
 * Llama al SP para obtener la lista de movimientos de una tarjeta con filtros.
 * @param {string} cardId - El UUID de la tarjeta.
 * @param {object} options - Objeto con los filtros y paginación.
 * @returns {Promise<Array<object>>} Un array de movimientos (o vacío).
 */
export const getCardMovementsFromDb = async (cardId, options = {}) => {
  // Desestructura las opciones con valores por defecto
  const {
    fromDate = null,
    toDate = null,
    type = null,
    q = null,
    page = 1,
    pageSize = 10
  } = options;

  // El orden DEBE coincidir con los argumentos del SP
  const params = [
    cardId,
    fromDate,
    toDate,
    type,
    q,
    page,
    pageSize
  ];

  try {
    const { rows } = await callSP('sp_card_movements_list', params);
    // Devuelve el array de movimientos.
    // Cada fila incluirá la columna 'total_rows'.
    return rows;

  } catch (error) {
    console.error('Error en sp_card_movements_list:', error.message);
    throw new Error('Error al obtener movimientos de la base de datos.');
  }
};

/**
 * Llama al SP para insertar un movimiento (compra o pago) en una tarjeta.
 * @param {string} cardId
 * @param {Date} fecha
 * @param {string} tipo - UUID del tipo de movimiento
 * @param {string} descripcion
 * @param {string} moneda - UUID de la moneda
 * @param {number} monto
 * @returns {Promise<object>} Objeto con { movement_id, nuevo_saldo_tarjeta }.
 */
export const addCardMovementInDb = async (cardId, fecha, tipo, descripcion, moneda, monto) => {
  // El orden DEBE coincidir con los argumentos del SP
  const params = [
    cardId,
    fecha,
    tipo,
    descripcion,
    moneda,
    monto
  ];

  try {
    const { rows } = await callSP('sp_card_movement_add', params);
    // Devuelve el objeto { movement_id, nuevo_saldo_tarjeta }
    return rows[0];

  } catch (error) {
    // Si el SP lanza un RAISE EXCEPTION, lo relanzamos
    console.error('Error en sp_card_movement_add:', error.message);
    throw error;
  }
};

/**
 * Llama al SP para obtener los datos cifrados (PIN/CVV) de una tarjeta.
 * @param {string} cardId - El UUID de la tarjeta.
 * @param {string} ownerId - El UUID del dueño (para validación).
 * @returns {Promise<object | null>} Objeto con { cvv_encrypted, pin_encrypted } o null.
 */
export const getEncryptedCardDetailsFromDb = async (cardId, ownerId) => {
  try {
    const { rows } = await callSP(
      'sp_cards_get_sensitive',
      [cardId, ownerId]
    );
    if (rows.length === 0) return null;
    return rows[0]; // { cvv_encrypted, pin_encrypted }

  } catch (error) {
    console.error('Error en sp_cards_get_sensitive:', error.message);
    throw new Error('Error al obtener datos sensibles de la tarjeta.');
  }
};