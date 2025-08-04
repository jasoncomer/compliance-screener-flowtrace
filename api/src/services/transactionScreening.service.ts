import { NextFunction, Response } from 'express';
import createHttpError from 'http-errors';
import { modelFactory } from '@src/db/modelFactory';
import * as blockchainService from './blockchain.service';
import { RiskScoringService } from './riskScoring.service';
import { IAuthRequest } from '@src/interfaces';
import { BtcTransaction } from '@src/models/BtcTransaction.model';
import { ETransactionStatus, IComplianceTransaction } from '@src/models/compliance/ComplianceTransaction.model';
import { fetchAttributionsMap, getCospendIdMap } from './attribution.service';
import { MonitoredAddressDocument } from '@src/models/compliance/MonitoredAddress.model';
import { IOrganization } from '@src/interfaces/organization';

/**
 * Service to handle the screening of transactions to monitored addresses
 */
export class TransactionScreeningService {
  private riskScoringService: RiskScoringService;

  constructor() {
    this.riskScoringService = new RiskScoringService();
  }

  /**
   * Process new transactions for all monitored addresses
   * This method should be called on a schedule (e.g., every 10 minutes)
   */
  public async processNewTransactions(): Promise<void> {
    try {
      // Get all monitored addresses from the database
      const MonitoredAddress = await modelFactory.getModel('MonitoredAddress');
      const monitoredAddresses = await MonitoredAddress.find({});

      console.log(`Processing transactions for ${monitoredAddresses.length} monitored addresses`);

      // Process one monitored address at a time with better error handling
      for (const address of monitoredAddresses) {
        try {
          await this.processAddressTransactions(address);
        } catch (error) {
          console.error(`Error processing transactions for address ${address.address}:`, error);
          // Continue with next address instead of stopping the entire process
        }
      }

      console.log(`Processed transactions for ${monitoredAddresses.length} monitored addresses`);
    } catch (error) {
      console.error('Error processing transactions:', error);
      // Don't rethrow - let the scheduler continue
    }
  }

  /**
   * Process transactions for a specific monitored address
   */
  private async processAddressTransactions(monitoredAddress: MonitoredAddressDocument): Promise<void> {
    try {
      // Get the ComplianceTransaction model
      const ComplianceTransaction = await modelFactory.getModel('ComplianceTransaction');

      // Get existing transaction IDs from the database to avoid duplicates
      const existingTxIds = await ComplianceTransaction.find({
        monitoredAddressId: monitoredAddress._id,
        organizationId: monitoredAddress.organizationId,
      }).distinct('txId');

      // Fetch new transactions from blockchain service
      const txsOfSendersToMonitoredAddress = await blockchainService.fetchAddressTransactionsTxid(
        monitoredAddress.address,
        existingTxIds,
        { page: 1, limit: 20 },
        'incoming',
      );

      // Create a Set for faster lookups
      const existingTxIdSet = new Set(existingTxIds);

      // Process transactions in batches to avoid memory issues
      const batchSize = 5;
      let processedCount = 0;

      for (let i = 0; i < txsOfSendersToMonitoredAddress.length; i += batchSize) {
        const batch = txsOfSendersToMonitoredAddress.slice(i, i + batchSize);

        // Process transactions in parallel with a limit
        await Promise.all(batch.map(async (tx) => {
          try {
            // Skip if transaction already exists
            if (existingTxIdSet.has(tx.txid)) {
              console.log(`Skipping transaction ${tx.txid} - already exists`);
              return;
            }

            // Process the new transaction
            await this.processTransaction(tx, monitoredAddress);
            processedCount++;
          } catch (error) {
            console.warn(`Error processing transaction ${tx.txid}: ${error}`);
            // Continue processing other transactions
          }
        }));

        // Force garbage collection between batches
        if (global.gc) {
          global.gc();
        }
      }

      console.log(`Processed ${processedCount} new transactions for address ${monitoredAddress.address}`);
    } catch (error) {
      console.error(`Error processing transactions for address ${monitoredAddress.address}:`, error);
    }
  }

  /**
   * Process a single transaction
   */
  private async processTransaction(transaction: BtcTransaction, monitoredAddress: MonitoredAddressDocument): Promise<void> {
    try {
      // Validate required transaction fields
      if (!transaction || !transaction.txid) {
        throw new Error('Invalid transaction: missing transaction ID');
      }

      if (!transaction.inputs || !transaction.outputs) {
        throw new Error(`Invalid transaction ${transaction.txid}: missing inputs or outputs`);
      }

      // Extract input addresses
      const inputAddresses = new Set<string>();
      transaction.inputs.forEach(input => {
        if (input.addr !== monitoredAddress.address) {
          inputAddresses.add(input.addr);
        }
      });

      // Get incoming amount
      let incomingAmount = 0;
      transaction.outputs.forEach(output => {
        if (output.addr === monitoredAddress.address) {
          incomingAmount = output.amt;
        }
      });

      const counterpartyAddresses = Array.from(inputAddresses);

      // If there are no counterparty addresses, skip this transaction
      if (counterpartyAddresses.length === 0) {
        return;
      }

      // Get the cospend_id for the addesses
      const cospendIdMap = await getCospendIdMap(counterpartyAddresses);
      const cospendIds = counterpartyAddresses.map(address => cospendIdMap.get(address) ?? address);

      // Get attributions
      const attributions = await fetchAttributionsMap(cospendIds);
      // Calculate risk score using the existing RiskScoringService
      const riskScoreResults = await Promise.all(cospendIds.map(async (cpAddress) => {
        return this.riskScoringService.calculateRiskScore(
          cpAddress,
          'address'
        );
      }));

      // Convert risk score to a scale of 0-100
      const riskScores = riskScoreResults
        .filter(result => !isNaN(result.overallRisk))
        .map(result => Math.round(result.overallRisk * 100));

      const counterpartyEntities = new Set<string>();
      cospendIds.forEach(cpAddress => {
        const attribution = attributions.get(cpAddress);
        if (attribution?.entity && !counterpartyEntities.has(attribution.entity)) {
          counterpartyEntities.add(attribution.entity);
        }
      });

      // Double-check for existing transaction to avoid race conditions
      const ComplianceTransaction = await modelFactory.getModel('ComplianceTransaction');
      const existingCount = await ComplianceTransaction.countDocuments({
        txId: transaction.txid,
        monitoredAddressId: monitoredAddress._id,
        organizationId: monitoredAddress.organizationId
      });
      if (existingCount > 0) {
        return;
      }

      // Check if risk is below the organization threshold
      let isBelowRiskThreshold = false;
      const Organization = await modelFactory.getModel('Organization');
      const organization: IOrganization | null = await Organization.findById(monitoredAddress.organizationId);
      if (organization?.settings?.riskScoreThreshold) {
        const riskScoreThreshold = organization.settings.riskScoreThreshold;
        if (riskScores.every(score => score < riskScoreThreshold)) {
          isBelowRiskThreshold = true;
        }
      }

      // Check is the amount is below the organization threshold
      let isBelowAmountThreshold = false;
      if (
        organization?.settings?.transactionThreshold &&
        parseFloat(organization.settings.transactionThreshold.toString()) > 0 &&
        incomingAmount < parseFloat(organization.settings.transactionThreshold.toString())
      ) {
        isBelowAmountThreshold = true;
      }

      // Create a new compliance transaction record
      const data: IComplianceTransaction = {
        txId: transaction.txid,
        monitoredAddressId: monitoredAddress._id,
        counterpartyEntities: Array.from(counterpartyEntities),
        blockchain: monitoredAddress.blockchain,
        amount: incomingAmount,
        timestamp: new Date(transaction.timestamp * 1000),
        riskScores,
        status: isBelowRiskThreshold || isBelowAmountThreshold ? ETransactionStatus.CLOSED_WITH_NOTE : ETransactionStatus.UNASSIGNED,
        organizationId: monitoredAddress.organizationId,
        clientId: monitoredAddress.clientId,
        sarSubmitted: false,
        statusHistory: [],
        notes: isBelowRiskThreshold ? 'Risk score below threshold' : isBelowAmountThreshold ? 'Amount below threshold' : undefined,
        // TODO: Should we add an automatic reviewer? This should be defined in the organization.
      }
      const newTransaction = new ComplianceTransaction(data);

      await newTransaction.save();
    } catch (error) {
      console.error(`Error processing transaction ${transaction.txid}:`, error);
    }
  }

  /**
   * Manually trigger processing for an organization's monitored addresses
   */
  public async processOrganizationTransactions(req: IAuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?._id;
      if (!userId) {
        return next(createHttpError.Unauthorized('Unauthorized - User not found'));
      }

      // Get the organization for this user
      const Organization = await modelFactory.getModel('Organization');
      const organization = await Organization.findOne({
        $or: [
          { ownerId: userId },
          { $and: [{ 'members.userId': userId }, { 'members.status': 'active' }] }
        ],
      }).populate('members.userId', 'name email');

      if (!organization) {
        return next(createHttpError.Forbidden('You do not have access to any organization'));
      }

      const organizationId = organization._id;

      // Get all monitored addresses for this organization
      const MonitoredAddress = await modelFactory.getModel('MonitoredAddress');
      const monitoredAddresses = await MonitoredAddress.find({ organizationId });

      // Process addresses in batches to avoid memory issues
      const batchSize = 3;
      for (let i = 0; i < monitoredAddresses.length; i += batchSize) {
        const batch = monitoredAddresses.slice(i, i + batchSize);
        await Promise.all(batch.map(address => this.processAddressTransactions(address)));

        // Force garbage collection between batches if available
        if (global.gc) {
          global.gc();
        }
      }

      res.status(200).json({
        success: true,
        error: false,
        message: `Successfully processed transactions for ${monitoredAddresses.length} monitored addresses`,
        status: 200,
        data: null
      });
    } catch (error) {
      console.error('Error processing organization transactions:', error);
      return next(createHttpError.InternalServerError('Internal server error'));
    }
  }
}

// Export an instance of the service for use in other modules
export const transactionScreeningService = new TransactionScreeningService();

/**
 * Automatically assigns unassigned transactions to the only member of an organization
 * @param organization The organization to check
 * @param transactions The transactions to process
 * @returns Promise<void>
 */
export const autoAssignTransactionsToSingleMember = async (
  organization: any,
  transactions: any[]
): Promise<void> => {
  // Check if organization has only one active member
  const activeMembers = organization.members.filter(member => member.status === 'active');
  const hasSingleMember = activeMembers.length === 1;
  const singleMemberId = hasSingleMember ? activeMembers[0].userId : null;

  // If organization has only one member, automatically assign unassigned transactions
  if (hasSingleMember && singleMemberId) {
    const unassignedTransactions = transactions.filter(t => t.status === ETransactionStatus.UNASSIGNED);

    if (unassignedTransactions.length > 0) {
      const updatePromises = unassignedTransactions.map(async (transaction) => {
        // Add current state to history if there's a reviewer
        if (transaction.reviewerId) {
          transaction.statusHistory.push({
            status: transaction.status,
            timestamp: transaction.reviewTimestamp as Date,
            reviewer: transaction.reviewerId,
          });
        }

        // Update transaction
        transaction.reviewerId = singleMemberId;
        transaction.status = ETransactionStatus.UNREVIEWED;
        transaction.reviewTimestamp = new Date();
        return transaction.save();
      });

      await Promise.all(updatePromises);
    }
  }
}; 