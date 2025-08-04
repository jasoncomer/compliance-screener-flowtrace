import express from 'express';
import * as sotController from '@src/controllers/sot.controller';
import { isAdmin } from '@src/middlewares/auth';

const router = express.Router();

router.get('/', sotController.getLatestSOTs);
router.get('/update', isAdmin, sotController.updateSOTFromGSheet);
router.get('/last-update', isAdmin, sotController.getLastSyncLogs);
router.get('/analyze', isAdmin, sotController.analyzeSheetStructure);
router.get('/cron-status', isAdmin, sotController.getCronStatus);
router.post('/trigger-sync', isAdmin, sotController.triggerManualSOTSync);

// NOTE: These are not used atm
// router.put('/:id', sotService.updateSOT);
// router.delete('/:id', sotService.removeSOT);

export = router; 