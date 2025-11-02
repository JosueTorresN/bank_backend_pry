// /auth.routes.js

import authController from '../../contollers/auth.controller.js';
import verifyApiKey from '../../middleware/apikey.js';
import { Router } from 'express';
const router = Router();

// Ruta de login
router.post('/login', verifyApiKey, authController.login);
router.post('/forgot-password', authController.forgotPassword)

export default router;