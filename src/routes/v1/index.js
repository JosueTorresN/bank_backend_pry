// /routes/v1/index.js

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import usersRoutes from './users.routes.js';
import accountRoutes from './accounts.routes.js'
import transferRoutes from './transfer.routes.js'

const router = Router(); // Necesitas el router de Express para montar sub-rutas

// 1. Importa los routers específicos (Asegúrate de que existan estos archivos)
// const authRoutes = require('./auth.routes');
// const usersRoutes = require('./users.routes');
// const accountRoutes = require('./accounts.routes');
// const cardRoutes = require('./cards.routes');
// const transferRoutes = require('./transfers.routes');
// const bankRoutes = require('./bank.routes');

// --- Monta los Routers ---

// 2. Monta los routers en sus rutas base (Ej: /api/v1/users, /api/v1/auth)
router.use('/auth', authRoutes); // Route: /api/v1/auth/...
router.use('/users', usersRoutes); // Route: /api/v1/users/...
router.use('/accounts', accountRoutes); // Route: /api/v1/accounts/...
// router.use('/cards', cardRoutes);        // Route: /api/v1/cards/...
router.use('/transfers', transferRoutes); // Route: /api/v1/transfers/...
// router.use('/bank', bankRoutes);         // Route: /api/v1/bank/...

// Ruta de prueba para v1 (Responde a GET /api/v1)
router.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API v1' });
});

// 3. Exporta el router de v1
export default router;