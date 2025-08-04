import express from 'express';
import { getEntityBalances, getEntityBalance } from '../controllers/entityBalanceSheet.controller';

const router = express.Router();

router.get('/', getEntityBalances);
router.get('/:entityId', getEntityBalance);

export = router; 