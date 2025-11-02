import bankController from '../../contollers/bank.controller.js';
import verifyApiKey from '../../middleware/apikey.js';
import config from '../../config/sentings.js';
import auth from '../../middleware/auth.js'
import { Router } from 'express';
const router = Router();

router.post('/validate-account', verifyApiKey, auth.verifyToken, bankController.validateAccount);

export default router;