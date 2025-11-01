// users.routes.js (o un controlador asociado)

import { Router } from 'express';
const router = Router();
import { query, callSP, pool } from '../../config/db.js' // Asume que db.js está un nivel arriba
import verifyApiKey from '../../middleware/apikey.js';
import controller from '../../contollers/user.controller.js';
// const bcrypt = require('bcrypt'); // Necesitarás instalar e importar bcrypt

// Endpoint POST /api/v1/users
router.post('/', verifyApiKey, controller.createUser);
router.get('/:identification', verifyApiKey, controller.getUserByIdentification);
export default router;