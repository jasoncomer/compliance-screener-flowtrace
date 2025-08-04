import express from 'express';
import * as cryptoController from '../controllers/crypto.controller';

const router = express.Router();

router.get('/prices', cryptoController.getCryptoPrices);

export = router; 