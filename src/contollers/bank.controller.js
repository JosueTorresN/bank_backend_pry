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
    if (!iban) {
      const error = new Error('El campo "iban" es requerido.');
      error.statusCode = 400;
      return next(error);
    }
    
    // 3. Llamar a la capa de base de datos
    const result = await validateAccountInDb(iban);

    // 4. Enviar respuesta exitosa
    // El 'result' ya tiene el formato { exists, owner_name, owner_id }
    res.success(200, result);

  } catch (error) {
    next(error); // Pasa al errorHandler
  }
};

export default {
  validateAccount
};