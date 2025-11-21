import config from '../config/sentings.js';

const centralBankAuth = (req, res, next) => {
  const token = req.header('X-API-TOKEN');

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Falta el header X-API-TOKEN.'
    });
  }

  if (token !== config.centralBankToken) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Token inválido.'
    });
  }

  next();
};

export default centralBankAuth;
