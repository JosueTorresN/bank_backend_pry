import accountController from '../../contollers/account.controller.js';
import verifyApiKey from '../../middleware/apikey.js';
import config from '../../config/sentings.js';
import auth from '../../middleware/auth.js'
import { Router } from 'express';
const router = Router();

router.post('/', verifyApiKey, auth.verifyToken, accountController.createAccount);
router.get('/', verifyApiKey, auth.verifyToken, accountController.getAccounts);
router.get('/:accountId', verifyApiKey, auth.verifyToken, accountController.getAccountById);
router.post('/:accountId/status', verifyApiKey, auth.verifyToken, auth.hasRole([config.ADMIN]), accountController.setAccountStatus);

export default router