import { Router } from 'express';
import { isAuth } from '@src/middlewares';
import {
  getSubscriptionTiersController,
  getOrganizationSubscriptionController,
  createOrganizationSubscriptionController,
  updateOrganizationSubscriptionController,
  cancelOrganizationSubscriptionController,
} from '@src/controllers/subscription.controller';

const router = Router();

// Get all subscription tiers (available to all authenticated users)
router.get('/tiers', isAuth, getSubscriptionTiersController);

// Organization subscription endpoints
router.get('/organizations/:organizationId', isAuth, getOrganizationSubscriptionController);
router.post('/organizations', isAuth, createOrganizationSubscriptionController);
router.put('/organizations/:organizationId', isAuth, updateOrganizationSubscriptionController);
router.delete('/organizations/:organizationId', isAuth, cancelOrganizationSubscriptionController);

export default router; 