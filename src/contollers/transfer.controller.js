import { createInternalTransferInDb } from '../db.controllers/transfer.db.controller.js';

/**
 * Controlador para crear una transferencia interna.
 * Se encarga de la autorización y el manejo de errores del SP.
 */
const createInternalTransfer = async (req, res, next) => {
  try {
    // 1. Obtener datos del Body
    const { fromAccountId, toAccountId, amount, currency, description } = req.body;
    
    // 2. Lógica de Seguridad: Obtener el dueño del token JWT
    const userId = req.user.id;

    // 3. Validación de Entrada (primera capa)
    const numericAmount = parseFloat(amount);
    if (!fromAccountId || !toAccountId || !currency || !numericAmount) {
      const error = new Error('Faltan campos requeridos: fromAccountId, toAccountId, currency, amount.');
      error.statusCode = 400;
      return next(error);
    }
    if (numericAmount <= 0) {
        const error = new Error('El monto (amount) debe ser mayor a cero.');
        error.statusCode = 400;
        return next(error);
    }
    
    // 4. Ensamblar los datos para el SP
    const transferData = {
      fromAccountId,
      toAccountId,
      amount: numericAmount,
      currency,
      description,
      userId
    };
    
    // 5. Llamar al controlador de DB
    const result = await createInternalTransferInDb(transferData);

    // 6. Enviar respuesta exitosa (201 Created)
    res.success(201, result);

  } catch (error) {
    // 7. Manejar Errores de Negocio (del RAISE EXCEPTION)
    
    // 400 Bad Request (Error del usuario)
    if (error.message.includes('monto') || error.message.includes('misma')) {
      error.statusCode = 400;
    }
    // 404 Not Found (Recurso no existe)
    else if (error.message.includes('no encontrada') || error.message.includes('no existe')) {
      error.statusCode = 404;
    }
    // 409 Conflict (Estado del recurso impide la acción)
    else if (error.message.includes('Saldo insuficiente')) {
      error.statusCode = 409;
    }
    // 403 Forbidden (No es dueño, aunque 404 es más seguro)
    else if (error.message.includes('no pertenece al usuario')) {
      error.statusCode = 404; // 404 es más seguro que 403 (no revela existencia)
    }
    
    next(error); // Pasa al errorHandler
  }
};

export default {
  createInternalTransfer
};