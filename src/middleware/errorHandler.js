// src/middleware/errorHandler.js

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  // Objeto de respuesta de error estandarizado
  const errorResponse = {
    error: {
      code: err.code || getErrorCode(statusCode),
      message: err.message || 'An internal server error occurred',
      details: err.details || [],
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    },
  };

  // expón headers que el frontend necesita (si usas X-Total-Count en otras rutas)
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count');

  // Envía siempre la respuesta como JSON
  res.status(statusCode).json(errorResponse);
};

// Función de utilidad para códigos de error
const getErrorCode = (statusCode) => {
  switch (statusCode) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE_ENTITY';
    default: return 'INTERNAL_SERVER_ERROR';
  }
};

export default errorHandler;