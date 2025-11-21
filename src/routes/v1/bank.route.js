import bankController from '../../contollers/bank.controller.js';
import { Router } from 'express';
import centralBankAuth from '../../middleware/centralBankAuth.js';

const router = Router();

router.post('/validate-account', centralBankAuth, bankController.validateAccount);

export default router;