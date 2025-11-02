import { callSP } from '../config/db.js'; // Asegúrate que la ruta sea correcta

/**
 * Llama al SP para crear una nueva cuenta en la base de datos.
 * @param {object} accountData - Objeto con los 7 parámetros del SP.
 * @returns {Promise<string>} El UUID de la nueva cuenta.
 */
export const createAccountInDb = async (accountData) => {
  // El orden de este array DEBE coincidir con el orden de los argumentos del SP
  const params = [
    accountData.usuario_id,
    accountData.iban,
    accountData.alias,
    accountData.tipo,
    accountData.moneda,
    accountData.saldo_inicial,
    accountData.estado
  ];

  try {
    const { rows } = await callSP('sp_accounts_create', params);
    // Devuelve el UUID de la cuenta creada
    return rows[0].sp_accounts_create;

  } catch (error) {
    // Si el SP lanza un error (ej: IBAN duplicado, si tuvieras esa restricción)
    // lo relanzamos para que el controlador principal lo maneje.
    console.error('Error en sp_accounts_create:', error.message);
    throw error;
  }
};

/**
 * Llama al SP para obtener una o más cuentas.
 * - Si se provee accountId, busca esa cuenta.
 * - Si se provee ownerId, filtra por dueño.
 * - Si se proveen ambos, valida que la cuenta pertenezca al dueño.
 * @param {string | null} ownerId - El UUID del dueño (opcional).
 * @param {string | null} accountId - El UUID de la cuenta (opcional).
 * @returns {Promise<Array<object>>} Un array de cuentas (puede estar vacío).
 */
export const getAccountsFromDb = async (ownerId = null, accountId = null) => {
  try {
    const { rows } = await callSP(
      'sp_accounts_get',
      [ownerId, accountId]
    );
    
    // Devuelve el array de cuentas.
    // Si no se encuentra nada, devolverá un array vacío [].
    return rows;

  } catch (error) {
    console.error('Error en sp_accounts_get:', error.message);
    throw new Error('Error al obtener cuentas de la base de datos.');
  }
};

/**
 * Llama al SP para cambiar el estado de una cuenta.
 * @param {string} accountId - El UUID de la cuenta a modificar.
 * @param {string} newStatusId - El UUID del nuevo estado.
 * @returns {Promise<boolean>} El resultado del SP (true si actualizó).
 */
export const setAccountStatusInDb = async (accountId, newStatusId) => {
  try {
    const { rows } = await callSP(
      'sp_accounts_set_status', 
      [accountId, newStatusId]
    );
    
    // Devuelve el booleano del SP
    return rows[0].sp_accounts_set_status;

  } catch (error) {
    // Si el SP lanza un RAISE EXCEPTION (ej: "No se puede cerrar..."),
    // lo relanzamos para que el controlador principal lo maneje.
    console.error('Error en sp_accounts_set_status:', error.message);
    throw error;
  }
};

/**
 * Llama al SP para obtener la lista de movimientos de una cuenta con filtros.
 * @param {string} accountId - El UUID de la cuenta.
 * @param {object} options - Objeto con los filtros y paginación.
 * @returns {Promise<Array<object>>} Un array de movimientos (o vacío).
 */
export const getAccountMovementsFromDb = async (accountId, options = {}) => {
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
    accountId,
    fromDate,
    toDate,
    type,
    q,
    page,
    pageSize
  ];

  try {
    const { rows } = await callSP('sp_account_movements_list', params);
    // Devuelve el array de movimientos.
    // Cada fila incluirá la columna 'total_rows'.
    return rows;

  } catch (error) {
    console.error('Error en sp_account_movements_list:', error.message);
    throw new Error('Error al obtener movimientos de la base de datos.');
  }
};