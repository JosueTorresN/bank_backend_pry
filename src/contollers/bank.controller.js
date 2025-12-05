import { validateAccountInDb } from '../db.controllers/bank.db.controller.js';

/**
 * Controlador para validar un IBAN.
 * Lógica de negocio:
 * 1. Llama al controlador de DB.
 * 2. Devuelve la información del titular si se encuentra.
 */
const validateAccount = async (req, res, next) => {
  try {
    // 1. Obtener datos del Body
    const { iban } = req.body;

    // 2. Validación de Entrada
    const IBAN_REGEX = /^CR01B\d{14}$/;;

    if (!iban || !IBAN_REGEX.test(iban)) {
      return res.status(400).json({
        error: 'INVALID_ACCOUNT_FORMAT',
        message: 'El formato del iban no es válido.'
      });
    }

    // 3. Llamar a la capa de base de datos
    const result = await validateAccountInDb(iban);

    // 4. Enviar respuesta exitosa con el contrato esperado
    res.status(200).json(result);

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

export default {
  validateAccount
};