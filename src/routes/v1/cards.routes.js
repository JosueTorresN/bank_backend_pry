import cardController from '../../contollers/card.controller.js';
import verifyApiKey from '../../middleware/apikey.js';
import config from '../../config/sentings.js';
import auth from '../../middleware/auth.js'
import { Router } from 'express';
const router = Router();

router.post('/', verifyApiKey, auth.verifyToken, cardController.createCard);
router.get('/', verifyApiKey, auth.verifyToken, cardController.getCards);
router.get('/:cardId', verifyApiKey, auth.verifyToken, cardController.getCardById);
router.get('/:cardId/movements', verifyApiKey, auth.verifyToken, cardController.getCardMovements);
router.post('/:cardId/movement', verifyApiKey, auth.verifyToken, cardController.addCardMovement);
router.post('/:cardId/otp', verifyApiKey, auth.verifyToken, cardController.requestPinCvvOtp);
router.post('/:cardId/view-details', verifyApiKey, auth.verifyToken, cardController.viewCardDetails);

export default router
