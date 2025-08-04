import express from 'express';
import { getAttributions, getRelatedEntitiesController } from '@src/controllers/attribution.controller';
import { isAuth } from '@src/middlewares';

const router = express.Router();

// Get attributions for addresses
router.post('/addresses', isAuth, getAttributions);

// Get unique BOs and custodians for an entity
router.get('/entity/:entity/unique-values', isAuth, getRelatedEntitiesController);

// Temporary test route without authentication (for debugging)
router.post('/test-addresses', getAttributions);

export default router; 