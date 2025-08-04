import express from 'express';

import caseRoutes from '@src/routes/case.route';
import blockchainRoutes from '@src/routes/blockchain.route';
import healthCheckRoute from '@src/routes/healthCheck.route';
import homeRoute from '@src/routes/home.route';
import authRoutes from '@src/routes/auth.route';
import sotRoutes from '@src/routes/sot.route';
import entityTypeMasterlistRoutes from '@src/routes/entityTypeMasterlist.route';
import riskScoringRoutes from '@src/routes/riskScoring.route';
import organizationRoutes from '@src/routes/organization.route';
import complianceRoutes from '@src/routes/compliance.route';
import attributionRoutes from '@src/routes/attribution.route';
import cryptoRoutes from '@src/routes/crypto.route';
import contactSalesRoutes from '@src/routes/contactSales.route';
import { isAuth } from '@src/middlewares/auth/checkIsAuth';

import pdfServeRoute from '@src/routes/pdfDoc.route';
import paymentRoute from '@src/routes/payment.route';
import reportRoutes from '@src/routes/report.route';
import subscriptionRoutes from '@src/routes/subscription.route';
import entityBalanceSheetRoutes from '@src/routes/entityBalanceSheet.route';
import socialMediaRoutes from '@src/routes/socialMedia.route';
import logoRoutes from '@src/routes/logo.route';

const router = express.Router();

// Public routes
router.use('/', homeRoute);
router.use('/auth', authRoutes);
router.use('/contact-sales', contactSalesRoutes);
router.use('/logos', logoRoutes);

// Protected routes (require authentication)
router.use(isAuth);

router.use('/case', caseRoutes);
router.use('/blockchain', blockchainRoutes);
router.use('/health-check', healthCheckRoute);
router.use('/sot', sotRoutes);
router.use('/entity-type-masterlist', entityTypeMasterlistRoutes);
router.use('/risk-scoring', riskScoringRoutes);
router.use('/organization', organizationRoutes);
router.use('/compliance', complianceRoutes);
router.use('/attribution', attributionRoutes);
router.use('/crypto', cryptoRoutes);
router.use('/contact-sales', contactSalesRoutes);
router.use('/pdf', pdfServeRoute);
router.use('/payment', paymentRoute);
router.use('/report', reportRoutes);
router.use('/subscription', subscriptionRoutes);
router.use('/entity-balance-sheet', entityBalanceSheetRoutes);
router.use('/social-media', socialMediaRoutes);

// Test route without authentication (for debugging)
router.use('/social-media-test', socialMediaRoutes);

// Temporary public blockchain routes for testing
router.use('/blockchain-test', blockchainRoutes);

// Temporary public risk scoring routes for testing
router.use('/risk-scoring-test', riskScoringRoutes);

// Public health check route for testing
router.use('/health-check-public', healthCheckRoute);

// Temporary public SoT routes for testing
router.use('/sot-test', sotRoutes);

// Temporary public attribution routes for testing
router.use('/attribution-test', attributionRoutes);

export default router;
