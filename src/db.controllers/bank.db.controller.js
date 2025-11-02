import { callSP } from '../config/db.js'; // Asegúrate que la ruta sea correcta

/**
 * Llama al SP para validar la existencia de un IBAN.
 * @param {string} iban - El IBAN a validar.
 *...
 * @returns {Promise<object>} Objeto con { exists, owner_name, owner_id }.
 */
export const validateAccountInDb = async (iban) => {
  try {
    const { rows } = await callSP(
      'sp_bank_validate_account',
      [iban]
    );
    
    // El SP siempre devuelve una fila, incluso si no se encuentra (exists: false)
    return rows[0];

  } catch (error) {
    console.error('Error en sp_bank_validate_account:', error.message);
    throw new Error('Error al validar la cuenta en la base de datos.');
  }
};