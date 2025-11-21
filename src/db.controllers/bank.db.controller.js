import { query } from '../config/db.js';

/**
 * Llama al SP para validar la existencia de un IBAN.
 * @param {string} iban - El IBAN a validar.
 *...
 * @returns {Promise<object>} Objeto con { exists, owner_name, owner_id }.
 */
export const validateAccountInDb = async (iban) => {
  try {
    const accountQuery = `
      SELECT
        u.nombre || ' ' || u.apellido AS name,
        u.identificacion AS identification,
        m.iso AS currency
      FROM cuenta c
      JOIN usuario u ON c.usuario_id = u.id
      JOIN moneda m ON c.moneda = m.id
      WHERE c.iban = $1
      LIMIT 1;
    `;

    const { rows } = await query(accountQuery, [iban]);

    if (rows.length === 0) {
      return { exists: false, info: null };
    }

    const account = rows[0];

    return {
      exists: true,
      info: {
        name: account.name,
        identification: account.identification,
        currency: account.currency,
        debit: true,
        credit: true
      }
    };

  } catch (error) {
    console.error('Error en la validación de cuenta:', error.message);
    throw new Error('Error al validar la cuenta en la base de datos.');
  }
};