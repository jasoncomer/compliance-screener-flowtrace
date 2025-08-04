import { Types } from 'mongoose';
import { NextFunction, Response, Request } from 'express';
import createHttpError from 'http-errors';
import { IAuthRequest } from '@src/interfaces';
import {
  getMonitoredAddressesService,
  createMonitoredAddressService,
  updateMonitoredAddressService,
  deleteMonitoredAddressService,
  bulkUploadMonitoredAddressesService,
  getComplianceTransactionsService,
  updateTransactionStatusService,
  getMonitoredAddressChangeHistoryService,
  updateTransactionAssigneeService,
} from '@src/services/compliance.service';
import { transactionScreeningService } from '@src/services/transactionScreening.service';
import { customResponse } from '@src/utils/customResponse';
import { modelFactory } from '@src/db/modelFactory';
import { isMemberOfOrganization, isOwnerOrAdmin } from '@src/services/organization.service';
import { ETransactionStatus } from '@src/models/compliance/ComplianceTransaction.model';


// Controller for both individual user and organization routes
export const getMonitoredAddressesController = (req: Request, res: Response, next: NextFunction) =>
  getMonitoredAddressesService(req as IAuthRequest, res, next);

export const createMonitoredAddressController = (req: Request, res: Response, next: NextFunction) =>
  createMonitoredAddressService(req as IAuthRequest, res, next);

export const updateMonitoredAddressController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => updateMonitoredAddressService(req as IAuthRequest, res, next);

export const deleteMonitoredAddressController = (req: Request, res: Response, next: NextFunction) =>
  deleteMonitoredAddressService(req as IAuthRequest, res, next);

export const bulkUploadMonitoredAddressesController = (req: Request, res: Response, next: NextFunction) =>
  bulkUploadMonitoredAddressesService(req as IAuthRequest, res, next);

export const getComplianceTransactionsController = (req: Request, res: Response, next: NextFunction) =>
  getComplianceTransactionsService(req as IAuthRequest, res, next);

export const updateTransactionStatusController = (req: Request, res: Response, next: NextFunction) =>
  updateTransactionStatusService(req as IAuthRequest, res, next);

export const getMonitoredAddressChangeHistoryController = (req: Request, res: Response, next: NextFunction) =>
  getMonitoredAddressChangeHistoryService(req as IAuthRequest, res, next);

export const updateTransactionAssigneeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionId: transactionIdString } = (req as any).params;
    const { assigneeId: assigneeIdString } = (req as any).body;

    if (!transactionIdString || !assigneeIdString) {
      return next(createHttpError(400, 'Transaction ID and assignee ID are required'));
    }

    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(transactionIdString) || !Types.ObjectId.isValid(assigneeIdString)) {
      return next(createHttpError(400, 'Invalid transaction ID or assignee ID format'));
    }

    const transactionId = new Types.ObjectId(transactionIdString);
    const assigneeId = new Types.ObjectId(assigneeIdString);

    const data = await updateTransactionAssigneeService((req as IAuthRequest).user?._id, transactionId, assigneeId);
    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Transaction assignee updated successfully',
        status: 200,
        data,
      })
    );
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateTransactionAssigneeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { transactionIds, assigneeId: assigneeIdString } = (req as any).body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return next(createHttpError(400, 'Transaction IDs array is required'));
    }

    if (!assigneeIdString) {
      return next(createHttpError(400, 'Assignee ID is required'));
    }

    // Validate assignee ID format
    if (!Types.ObjectId.isValid(assigneeIdString)) {
      return next(createHttpError(400, 'Invalid assignee ID format'));
    }

    const assigneeId = new Types.ObjectId(assigneeIdString);
    const userId = (req as IAuthRequest).user?._id;

    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    // Check if the assignee is a valid user
    const User = await modelFactory.getModel('User');
    const assignee = await User.findById(assigneeId);
    if (!assignee) {
      return next(createHttpError(400, 'Invalid assignee ID'));
    }

    // Check if the assignee is an organization member
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
      'members.status': 'active'
    });
    if (!organization) {
      return next(createHttpError(400, 'Assignee is not a member of any active organization'));
    }

    // Check if the user has access to the organization
    const canUpdate = isOwnerOrAdmin(organization, (req as IAuthRequest).user?._id);
    if (!canUpdate) {
      throw createHttpError(403, 'You do not have access to this organization');
    }

    // Check if the assignee is a member of the organization
    const isMember = isMemberOfOrganization(organization, assigneeId);
    if (!isMember) {
      throw createHttpError(403, 'You do not have access to this organization');
    }

    const results: any[] = [];
    const errors: { transactionId: string; error: string }[] = [];

    // fetch all transactions
    const ComplianceTransaction = await modelFactory.getModel('ComplianceTransaction');
    const transactions = await ComplianceTransaction.find({
      _id: { $in: transactionIds },
      organizationId: organization._id
    });
    if (!transactions) {
      throw createHttpError(404, 'Compliance transactions not found');
    }

    // Process all transactions in parallel
    const updatePromises = transactions.map((transaction) => {
      // Is there a current reviewer? Add to history
      const currentReviewer = transaction.reviewerId;
      if (currentReviewer) {
        transaction.statusHistory.push({
          status: transaction.status,
          timestamp: transaction.reviewTimestamp as Date,
          reviewer: currentReviewer,
        });
      }

      // Update assignee
      transaction.reviewerId = assigneeId;
      transaction.reviewTimestamp = new Date();

      // If transaction is unassigned, set status to UNREVIEWED
      if (transaction.status === ETransactionStatus.UNASSIGNED) {
        transaction.status = ETransactionStatus.UNREVIEWED;
      }

      return transaction.save();
    });

    // Wait for all promises to resolve
    const updateResults = await Promise.all(updatePromises);

    // Process results
    for (let index = 0; index < updateResults.length; index++) {
      const result = updateResults[index];
      if (result) {
        results.push(result);
      } else {
        errors.push({
          transactionId: transactions[index]._id.toString(),
          error: 'Failed to update transaction'
        });
      }
    }

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Transactions assignees updated successfully',
        status: 200,
        data: {
          successCount: results.length,
          errorCount: errors.length,
          results,
          errors
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Process new transactions for all monitored addresses of an organization
 */
export const processOrganizationTransactionsController = async (req: Request, res: Response, next: NextFunction) => {
  return transactionScreeningService.processOrganizationTransactions(req as IAuthRequest, res, next);
};
