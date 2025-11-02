// users.routes.js (o un controlador asociado)

import { Router } from 'express';
const router = Router();
import { query, callSP, pool } from '../../config/db.js' // Asume que db.js está un nivel arriba
import verifyApiKey from '../../middleware/apikey.js';
import auth from '../../middleware/auth.js'
import controller from '../../contollers/user.controller.js';
import config from '../../config/sentings.js';
// const bcrypt = require('bcrypt'); // Necesitarás instalar e importar bcrypt

// Endpoint POST /api/v1/users
router.post('/', verifyApiKey, controller.createUser);
router.get('/:identificacion', verifyApiKey, auth.verifyToken ,controller.getUserByIdentification);
router.put('/:id', verifyApiKey, auth.verifyToken, auth.hasRole([config.ADMIN]), controller.updateUser);
router.delete('/:id', verifyApiKey, auth.verifyToken, auth.hasRole([config.ADMIN]), controller.deleteUser);
export default router;