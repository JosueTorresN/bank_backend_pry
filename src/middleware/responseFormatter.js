const responseFormatter = (req, res, next) => {
  res.success = (statusCode, data) => {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      data: data || null, // Para respuestas 204
    };
    return res.status(statusCode).json(response);
  };
  next();
};

export default responseFormatter;