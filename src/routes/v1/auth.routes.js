// /auth.routes.js

import authController from '../../contollers/auth.controller.js';
import verifyApiKey from '../../middleware/apikey.js';
import { Router } from 'express';
const router = Router();

// Ruta de login
console.log("Si pasa por auth");
router.post('/login', verifyApiKey, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);

export default router;