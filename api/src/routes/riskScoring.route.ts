import express from 'express';
import { calculateRiskScore } from '@src/controllers/risk-scoring.controller';

const router = express.Router();

router.post('/calculate', calculateRiskScore);

export default router; 