// users.routes.js

import { Router } from 'express';
const router = Router();
import { query, callSP, pool } from '../../config/db.js' 
import verifyApiKey from '../../middleware/apikey.js';
import auth from '../../middleware/auth.js'
import controller from '../../contollers/user.controller.js';
import config from '../../config/sentings.js';

// Endpoint POST /api/v1/users
router.post('/', verifyApiKey, controller.createUser);
router.get('/:identificacion', verifyApiKey, auth.verifyToken ,controller.getUserByIdentification);
router.put('/:id', verifyApiKey, auth.verifyToken, auth.hasRole([config.ADMIN]), controller.updateUser);
router.delete('/:id', verifyApiKey, auth.verifyToken, auth.hasRole([config.ADMIN]), controller.deleteUser);
export default router;