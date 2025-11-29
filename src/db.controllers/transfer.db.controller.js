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

// 1. Guardar la intención inicial (Status: PENDING_INTENT)
export const createInterbankTransactionInDb = async (data) => {
  const params = [
    data.transactionId,
    data.fromAccountId,
    data.toAccountId,
    data.amount,
    data.currency,
    data.description,
    data.userId
  ];
  // SP sugerido: sp_transfer_interbank_init
  // Debe verificar saldo inicial pero NO debitar aun, solo registrar el log.
  return await callSP('sp_transfer_interbank_init', params);
};

// 2. Reservar Fondos (Status: RESERVED)
export const reserveFundsInDb = async (transactionId, fromIban, amount) => {
  // SP sugerido: sp_transfer_interbank_reserve
  // Debe: Verificar saldo, Restar saldo "disponible", poner estado RESERVED
  // Retorna error si no hay fondos.
  // Nota: Si el amount no viene en el evento reserve, búscalo por transactionId
  const params = [transactionId]; 
  return await callSP('sp_transfer_interbank_reserve', params);
};

// 3. Registrar Crédito Pendiente (Status: INCOMING_PENDING)
export const registerIncomingPendingInDb = async (transactionId, toIban, amount, currency) => {
  // SP sugerido: sp_transfer_interbank_incoming_init
  // Verifica si la cuenta 'toIban' existe y es válida.
  // Registra la transacción entrante.
  const params = [transactionId, toIban, amount, currency];
  return await callSP('sp_transfer_interbank_incoming_init', params);
};

// 4. Confirmar Débito (Status: DEBITED)
export const confirmDebitInDb = async (transactionId) => {
  const params = [transactionId];
  return await callSP('sp_transfer_interbank_confirm_debit', params);
};

// 5. Finalizar (COMMIT/REJECT)
export const finalizeTransactionInDb = async (transactionId, status, reason = null) => {
  // SP sugerido: sp_transfer_interbank_finalize
  // Si status == COMMITTED: Hace permanentes los cambios.
  // Si status == REJECTED: Guarda el motivo.
  const params = [transactionId, status, reason];
  return await callSP('sp_transfer_interbank_finalize', params);
};

// 6. Rollback
export const rollbackTransactionInDb = async (transactionId) => {
  // SP sugerido: sp_transfer_interbank_rollback
  // Devuelve los fondos reservados si era origen.
  // Borra/Cancela el crédito pendiente si era destino.
  const params = [transactionId];
  return await callSP('sp_transfer_interbank_rollback', params);
};