import transferController from '../../contollers/transfer.controller.js';
import verifyApiKey from '../../middleware/apikey.js';
import config from '../../config/sentings.js';
import auth from '../../middleware/auth.js'
import { Router } from 'express';

const router = Router();

router.post('/internal', verifyApiKey, auth.verifyToken, transferController.createInternalTransfer)

export default router