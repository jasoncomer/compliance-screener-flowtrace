import { NextFunction, Response } from 'express';
import createHttpError from 'http-errors';
import mongoose, { Types } from 'mongoose';
import { customResponse } from '@src/utils';
import { modelFactory } from '@src/db/modelFactory';
import { IAuthRequest } from '@src/interfaces';
import { MonitoredAddressChange } from '@src/models/compliance/MonitoredAddressChange.model';
import { ETransactionStatus } from '@src/models/compliance/ComplianceTransaction.model';
import { isMemberOfOrganization, isOwnerOrAdmin } from './organization.service';
import { autoAssignTransactionsToSingleMember } from './transactionScreening.service';

/**
 * Get all monitored addresses for an organization or individual user
 */
export const getMonitoredAddressesService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ]
    }).populate('members.userId', 'name email');
    if (!organization) {
      return next(createHttpError(403, 'You do not have access to any organization'));
    }
    const organizationId = organization._id;
    const query: Record<string, object> = { organizationId };

    // Get monitored addresses
    const MonitoredAddress = await modelFactory.getModel('MonitoredAddress');
    const addresses = await MonitoredAddress.find(query);

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Monitored addresses retrieved successfully',
        status: 200,
        data: addresses
      })
    );
  } catch (error) {
    console.error('Error retrieving monitored addresses:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Create a new monitored address for an organization or individual user
 */
export const createMonitoredAddressService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ]
    }).populate('members.userId', 'name email');

    if (!organization) {
      return next(createHttpError(403, 'You do not have access to any organization'));
    }
    const organizationId = organization._id;
    const { address, blockchain, clientId, notes } = req.body;

    // Create new monitored address
    const MonitoredAddress = await modelFactory.getModel('MonitoredAddress');
    const query = { address: address, organizationId: organizationId };
    const existingAddress = await MonitoredAddress.findOne(query);
    if (existingAddress) {
      return next(createHttpError(400, 'This address is already being monitored for this blockchain'));
    }

    const newAddress = new MonitoredAddress({
      address: address,
      blockchain: blockchain,
      clientId,
      organizationId,
      notes,
    });

    await newAddress.save();

    // Create audit log
    const MonitoredAddressChange = await modelFactory.getModel('MonitoredAddressChange');
    const changeRecord = new MonitoredAddressChange({
      monitoredAddressId: newAddress._id,
      changeType: 'create',
      newValue: undefined,
      changedById: userId,
      organizationId,
      timestamp: new Date()
    } as MonitoredAddressChange);
    await changeRecord.save();

    return res.status(201).json(
      customResponse({
        success: true,
        error: false,
        message: 'Monitored address created successfully',
        status: 201,
        data: newAddress
      })
    );
  } catch (error) {
    console.error('Error creating monitored address:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Update a monitored address for an organization or individual user
 */
export const updateMonitoredAddressService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }
    // Check for organizationId in both query params and route params
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
    });
    const organizationId = organization?._id;

    // Extract update data from the request body
    const { updateData } = req.body;
    const _id = mongoose.Types.ObjectId.createFromHexString(id);

    // Find the address to update
    const MonitoredAddressModel = await modelFactory.getModel('MonitoredAddress');
    const query = organizationId
      ? { _id, organizationId }
      : { _id, organizationId: null };

    const address = await MonitoredAddressModel.findOne(query);
    if (!address) {
      return next(createHttpError(404, 'Monitored address not found'));
    }

    // Track changes for history
    const changes: Array<Partial<MonitoredAddressChange>> = [];

    // Validate updateData fields
    const allowedFields = ['address', 'blockchain', 'clientId', 'notes'];
    const invalidFields = Object.keys(updateData).filter(field => !allowedFields.includes(field));
    if (invalidFields.length > 0) {
      return next(createHttpError(400, `Invalid fields in update data: ${invalidFields.join(', ')}`));
    }

    // Check each field for changes
    for (const [key, value] of Object.entries(updateData)) {
      let hasChanged = false;
      const oldValue = address[key];
      const newValue = value;

      if (oldValue !== newValue) {
        hasChanged = true;
      }

      if (hasChanged) {
        // Create the base change object
        const change: Partial<MonitoredAddressChange> = {
          monitoredAddressId: address._id,
          changeType: 'update',
          fieldName: key,
          oldValue: oldValue,
          newValue: value as string | undefined,
          changedById: userId,
        };

        // Add organizationId if it exists
        if (organizationId) {
          change.organizationId = new mongoose.Types.ObjectId(organizationId);
        }

        changes.push(change);
      }
    }

    // Update the address
    address.set(updateData);
    await address.save();

    // Save change history records
    const MonitoredAddressChange = await modelFactory.getModel('MonitoredAddressChange');
    if (changes.length > 0) {
      await MonitoredAddressChange.insertMany(changes);
    }

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Monitored address updated successfully',
        status: 200,
        data: address
      })
    );
  } catch (error) {
    console.error('Error updating monitored address:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Delete a monitored address for an organization or individual user
 */
export const deleteMonitoredAddressService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }
    // Check for organizationId in both query params and route params
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
    });
    const organizationId = organization?._id;


    const query = organizationId
      ? { _id: id, organizationId }
      : { _id: id, organizationId: null };

    // Find the address before deleting it
    const MonitoredAddress = await modelFactory.getModel('MonitoredAddress');
    const address = await MonitoredAddress.findOne(query);
    if (!address) {
      return next(createHttpError(404, 'Monitored address not found'));
    }

    // Record the deletion in the change history
    const MonitoredAddressChange = await modelFactory.getModel('MonitoredAddressChange');
    const changeRecord = new MonitoredAddressChange({
      monitoredAddressId: address._id,
      changeType: 'delete',
      oldValue: {
        address: address.address,
        blockchain: address.blockchain,
        clientId: address.clientId,
        notes: address.notes,
        organizationId: address.organizationId
      },
      changedById: userId,
      organizationId: address.organizationId,
      timestamp: new Date()
    });

    await changeRecord.save();

    // Delete the address
    const result = await MonitoredAddress.findByIdAndUpdate(query, { isActive: false });
    if (!result) {
      return next(createHttpError(404, 'Monitored address not updated'));
    }

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Monitored address deleted successfully',
        status: 200,
        data: { deleted: true }
      })
    );
  } catch (error) {
    console.error('Error deleting monitored address:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Bulk upload monitored addresses for an organization or individual user
 */
export const bulkUploadMonitoredAddressesService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
    });
    const organizationId = organization?._id;
    const { addresses } = req.body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return next(createHttpError(400, 'Addresses must be a non-empty array'));
    }

    let orgId;

    // If organizationId is provided, validate organization access
    if (organizationId) {
      const Organization = await modelFactory.getModel('Organization');
      const organization = await Organization.findOne({
        _id: organizationId,
        'members.userId': userId,
        'members.status': 'active'
      });

      if (!organization) {
        return next(createHttpError(403, 'You do not have access to this organization'));
      }

      // Check if user has permission to add addresses (must be manager or owner)
      const userMember = organization.members.find(m => m.userId?.toString() === userId.toString());
      if (!userMember || (userMember.role !== 'manager' && organization.ownerId.toString() !== userId.toString())) {
        return next(createHttpError(403, 'You do not have permission to add addresses to this organization'));
      }

      orgId = organizationId;
    }

    const MonitoredAddress = await modelFactory.getModel('MonitoredAddress');

    // Process each address
    const results: { successful: object[]; failed: object[] } = {
      successful: [],
      failed: []
    };

    for (const entry of addresses) {
      try {
        // Validate required fields
        if (!entry.address || !entry.blockchain || !entry.clientId) {
          results.failed.push({
            entry,
            reason: 'Missing required fields: address, blockchain, and clientId are required'
          });
          continue;
        }

        // Check if address already exists for this organization/user and blockchain
        const query = orgId
          ? { address: entry.address, blockchain: entry.blockchain, organizationId: orgId }
          : { address: entry.address, blockchain: entry.blockchain, organizationId: null };

        const existingAddress = await MonitoredAddress.findOne(query);

        if (existingAddress) {
          results.failed.push({
            entry,
            reason: 'Address already exists for this blockchain'
          });
          continue;
        }

        // Create new address
        const newAddress = new MonitoredAddress({
          address: entry.address,
          blockchain: entry.blockchain,
          clientId: entry.clientId,
          notes: entry.notes,
          organizationId: orgId
        });

        await newAddress.save();
        results.successful.push(entry);
      } catch (error) {
        console.error('Error processing address:', error);
        results.failed.push({
          entry,
          reason: 'Internal error processing address'
        });
      }
    }

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Bulk upload processed',
        status: 200,
        data: results
      })
    );
  } catch (error) {
    console.error('Error bulk uploading addresses:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Get transactions for monitored addresses for an organization or individual user
 */
export const getComplianceTransactionsService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
    });
    if (!organization) {
      return next(createHttpError(403, 'You do not have access to any organization'));
    }
    const organizationId = organization?._id;

    const {
      status,
      blockchain,
      clientId,
      timestamp,
      minAmount,
      maxAmount,
      page = 1,
      limit = 20,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query: Record<string, any> = {
      organizationId,
    };

    // Status filter - support both single status and multiple statuses
    if (status) {
      // Handle both comma-separated string and array formats
      const statusArray = Array.isArray(status)
        ? status
        : typeof status === 'string'
          ? status.split(',').map(s => s.trim())
          : [status];

      if (statusArray.length > 0) {
        query.status = { $in: statusArray };
      }
    }

    // Blockchain filter
    if (blockchain) {
      query.blockchain = blockchain as string;
    }

    // Client ID filter
    if (clientId) {
      query.clientId = clientId as string;
    }

    // Timestamp filter - support both legacy startDate/endDate and new timestamp object
    if (timestamp) {
      const timestampObj = typeof timestamp === 'string'
        ? JSON.parse(timestamp as string)
        : timestamp;

      if (timestampObj.from || timestampObj.to) {
        query.timestamp = {};
        if (timestampObj.from) {
          query.timestamp.$gte = new Date(timestampObj.from);
        }
        if (timestampObj.to) {
          // Set to end of day
          const toDate = new Date(timestampObj.to);
          toDate.setHours(23, 59, 59, 999);
          query.timestamp.$lte = toDate;
        }
      }
    } else if (req.query.startDate || req.query.endDate) {
      // Legacy support
      query.timestamp = {};
      if (req.query.startDate) {
        query.timestamp.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        const endDate = new Date(req.query.endDate as string);
        endDate.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDate;
      }
    }

    // Amount filters - apply client filters and organizational constraints
    const orgMinAmount = organization?.settings.transactionThreshold || 0;
    
    // Initialize amount query object if any amount filtering is needed
    if (minAmount || maxAmount || orgMinAmount > 0) {
      query.amount = query.amount || {};
    }
    
    // Apply minimum amount filter
    if (minAmount || orgMinAmount > 0) {
      // Use the higher of client minAmount or organizational threshold
      // This ensures compliance while allowing users to be more restrictive
      const effectiveMinAmount = Math.max(Number(minAmount || 0), orgMinAmount);
      query.amount.$gte = effectiveMinAmount;
    }
    
    // Apply maximum amount filter (client-specified only)
    if (maxAmount) {
      query.amount.$lte = Number(maxAmount);
    }

    // Risk level filter
    const orgRiskThreshold = organization?.settings.riskScoreThreshold || 0;
    if (orgRiskThreshold !== undefined) {
      query.riskScores = { $not: { $elemMatch: { $lt: orgRiskThreshold } } };
    }

    // Get transactions with pagination
    const skip = (Number(page) - 1) * Number(limit);
    const ComplianceTransaction = await modelFactory.getModel('ComplianceTransaction');

    // Validate sortBy field - only allow specific fields for security
    const allowedSortFields = [
      'timestamp',
      'amount', 
      'status',
      'blockchain',
      'clientId',
      'reviewTimestamp',
      'riskScores',
      'createdAt',
      'updatedAt'
    ];
    
    const sortField = allowedSortFields.includes(sortBy as string) ? sortBy as string : 'timestamp';
    const sortDirection = (sortOrder as string).toLowerCase() === 'asc' ? 1 : -1;
    const sortObj: Record<string, 1 | -1> = { [sortField]: sortDirection };

    const [transactions, total] = await Promise.all([
      ComplianceTransaction.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(Number(limit)),
      ComplianceTransaction.countDocuments(query)
    ]);

    // Auto-assign transactions if organization has only one member
    await autoAssignTransactionsToSingleMember(organization, transactions);

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Compliance transactions retrieved successfully',
        status: 200,
        data: {
          transactions,
          total,
          page: Number(page),
          limit: Number(limit),
          sortBy: sortBy as string,
          sortOrder: sortOrder as string
        }
      })
    );
  } catch (error) {
    console.error('Error retrieving compliance transactions:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Update transaction status for an organization or individual user
 */
export const updateTransactionStatusService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
      'members.status': 'active'
    });
    const organizationId = organization?._id;
    const { transactionId } = req.params;
    const { status, notes, reviewerId } = req.body;

    // Who is approving this transaction?

    // Save approval date

    const query: Record<string, string | null> = {
      _id: transactionId,
      organizationId: organizationId?.toString(),
      createdBy: userId
    };

    // Find the transaction
    const ComplianceTransaction = await modelFactory.getModel('ComplianceTransaction');
    const transaction = await ComplianceTransaction.findOne(query);

    if (!transaction) {
      return next(createHttpError(404, 'Transaction not found'));
    }

    // Update transaction status
    transaction.status = status;
    if (notes !== undefined) {
      transaction.notes = notes;
    }
    if (reviewerId !== undefined) {
      transaction.reviewerId = new Types.ObjectId(reviewerId);
    }
    transaction.reviewTimestamp = new Date();

    await transaction.save();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Transaction status updated successfully',
        status: 200,
        data: transaction
      })
    );
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Get change history for a monitored address
 */
export const getMonitoredAddressChangeHistoryService = async (req: IAuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    if (!userId) {
      return next(createHttpError(401, 'Unauthorized - User not found'));
    }

    // Check for organizationId in both query params and route params
    const Organization = await modelFactory.getModel('Organization');
    const organization = await Organization.findOne({
      $or: [
        { ownerId: userId },
        { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
      ],
    });
    const organizationId = organization?._id;

    // Check if the user has access to the address
    const MonitoredAddress = await modelFactory.getModel('MonitoredAddress');
    const query = { _id: id, organizationId };

    // Check if the address exists
    const address = await MonitoredAddress.findOne(query)
      .select('address blockchain clientId notes organizationId');
    if (!address) {
      return next(createHttpError(404, 'Monitored address not found'));
    }

    // Get the change history
    const MonitoredAddressChange = await modelFactory.getModel('MonitoredAddressChange');
    const changes = await MonitoredAddressChange.find({ monitoredAddressId: id })
      .sort({ timestamp: -1 })
      .populate('changedById', 'name email')
      .exec();

    return res.status(200).json(
      customResponse({
        success: true,
        error: false,
        message: 'Monitored address change history retrieved successfully',
        status: 200,
        data: changes
      })
    );
  } catch (error) {
    console.error('Error retrieving monitored address change history:', error);
    return next(createHttpError(500, 'Internal server error'));
  }
};

/**
 * Update transaction assignee for an organization or individual user
 */
export const updateTransactionAssigneeService = async (
  reqUserId: Types.ObjectId,
  transactionId: Types.ObjectId,
  assigneeId: Types.ObjectId
) => {
  // Get compliance transaction
  const ComplianceTransaction = await modelFactory.getModel('ComplianceTransaction');
  const transaction = await ComplianceTransaction.findById(transactionId);
  if (!transaction) {
    throw createHttpError(404, 'Compliance transaction not found');
  }

  // Get organization
  const Organization = await modelFactory.getModel('Organization');
  const organization = await Organization.findById(transaction.organizationId);
  if (!organization) {
    throw createHttpError(404, 'Organization not found');
  }

  // Check if the user has access to the organization
  const canUpdate = isOwnerOrAdmin(organization, reqUserId);
  if (!canUpdate) {
    throw createHttpError(403, 'You do not have access to this organization');
  }

  // Check if the assignee is a member of the organization
  const isMember = isMemberOfOrganization(organization, assigneeId);
  if (!isMember) {
    throw createHttpError(403, 'You do not have access to this organization');
  }

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

  await transaction.save();

  return transaction;
}