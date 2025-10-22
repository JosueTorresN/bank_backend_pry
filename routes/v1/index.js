const express = require('express');
const router = express.Router();

// Importa los routers específicos (aún no los hemos creado, pero los definimos)
// const authRoutes = require('./auth.routes');
// const userRoutes = require('./users.routes');
// const accountRoutes = require('./accounts.routes');
// const cardRoutes = require('./cards.routes');
// const transferRoutes = require('./transfers.routes');
// const bankRoutes = require('./bank.routes');

// Monta los routers en sus rutas base [cite: 86, 90, 96, 102]
// router.use('/auth', authRoutes);         // Ej: /api/v1/auth/login
// router.use('/users', userRoutes);        // Ej: /api/v1/users
// router.use('/accounts', accountRoutes);  // Ej: /api/v1/accounts
// router.use('/cards', cardRoutes);        // Ej: /api/v1/cards
// router.use('/transfers', transferRoutes);  // Ej: /api/v1/transfers/internal
// router.use('/bank', bankRoutes);         // Ej: /api/v1/bank/validate-account

// Ruta de prueba para v1
router.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API v1' });
});

module.exports = router;