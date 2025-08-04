import express from 'express';
import { submitContactSalesController, getContactSalesRequestsController } from '@src/controllers/contactSales.controller';
import { isAuth } from '@src/middlewares/auth/checkIsAuth';

const router = express.Router();

// Public route for submitting contact sales requests
router.post('/submit', submitContactSalesController);

// Admin route for getting contact sales requests (protected)
router.get('/requests', isAuth, getContactSalesRequestsController);

export default router; 