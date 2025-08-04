import express from 'express';
import {
  getMonitoredAddressesController,
  createMonitoredAddressController,
  updateMonitoredAddressController,
  deleteMonitoredAddressController,
  bulkUploadMonitoredAddressesController,
  getComplianceTransactionsController,
  updateTransactionStatusController,
  getMonitoredAddressChangeHistoryController,
  processOrganizationTransactionsController,
  updateTransactionAssigneeController,
  bulkUpdateTransactionAssigneeController
} from '@src/controllers/compliance.controller';
import { isAuth } from '@src/middlewares';

const router = express.Router();

// Individual user routes
router.get('/monitored-addresses', isAuth, getMonitoredAddressesController);
router.post('/monitored-addresses', isAuth, createMonitoredAddressController);
router.put('/monitored-addresses/:id', isAuth, updateMonitoredAddressController);
router.delete('/monitored-addresses/:id', isAuth, deleteMonitoredAddressController);
router.get('/monitored-addresses/:id/history', isAuth, getMonitoredAddressChangeHistoryController);
router.post('/monitored-addresses/bulk', isAuth, bulkUploadMonitoredAddressesController);

router.get('/transactions', isAuth, getComplianceTransactionsController);
router.put('/transactions/:transactionId/status', isAuth, updateTransactionStatusController);
router.put('/transactions/:transactionId/assignee', isAuth, updateTransactionAssigneeController);
router.post('/transactions/bulk/assignee', isAuth, bulkUpdateTransactionAssigneeController);

// Manual trigger for transaction processing
router.post('/process-transactions', isAuth, processOrganizationTransactionsController);

export default router; 