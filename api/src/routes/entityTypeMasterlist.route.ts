import { Router } from 'express';
import * as entityTypeMasterlistController from '../controllers/entityTypeMasterlist.controller';
import { isAdmin } from '../middlewares/auth';

const router = Router();

// Get all entity types
router.get('/', isAdmin, entityTypeMasterlistController.getEntityTypeMasterlist);

// Update from Google Sheet
router.get('/update', isAdmin, entityTypeMasterlistController.updateEntityTypeMasterlistFromGSheet);

// Manual sync trigger
router.post('/sync', isAdmin, entityTypeMasterlistController.triggerManualEntityTypeMasterlistSync);

// Get sync logs
router.get('/sync-logs', isAdmin, entityTypeMasterlistController.getLastSyncLogs);

// Get unique categories
router.get('/categories', isAdmin, entityTypeMasterlistController.getCategories);

// Get unique subcategories (optionally filtered by category)
router.get('/subcategories', isAdmin, entityTypeMasterlistController.getSubcategories);

// Get unique top-level groups
router.get('/top-level-groups', isAdmin, entityTypeMasterlistController.getTopLevelGroups);

// Get cron job status
router.get('/cron-status', isAdmin, entityTypeMasterlistController.getCronStatus);

// Get specific entity type
router.get('/:entityType', isAdmin, entityTypeMasterlistController.getEntityTypeMasterlistByType);

export default router; 