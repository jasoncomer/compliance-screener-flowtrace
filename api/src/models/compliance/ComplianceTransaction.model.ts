import mongoose, { Schema, Document } from 'mongoose';

export enum ETransactionStatus {
  UNASSIGNED = 'UNASSIGNED', // Default. Transition to UNREVIEWED when assigned to compliance member
  UNREVIEWED = 'UNREVIEWED', // Transition to APPROVED

  IN_REVIEW = 'IN_REVIEW', // Reviewed by compliance team

  APPROVED = 'APPROVED', // Approved by compliance team
  HOLD = 'HOLD', // Hold by compliance team

  CLOSED_WITH_NOTE = 'CLOSED_WITH_NOTE', // Closed with note
  CLOSED_WITH_SAR = 'CLOSED_WITH_SAR', // Closed with SAR report
}

export type TTransactionStatus = keyof typeof ETransactionStatus;

export interface IComplianceTransaction {
  txId: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;

  clientId: string;
  monitoredAddressId: mongoose.Types.ObjectId;
  counterpartyEntities: string[];
  blockchain: string;
  amount: number;
  timestamp: Date;
  riskScores: number[];
  organizationId: mongoose.Types.ObjectId;
  notes?: string;

  // Question: status vs new field for SAR reports?
  sarSubmitted: boolean;
  sarReport?: mongoose.Types.ObjectId | null;

  reviewerId?: mongoose.Types.ObjectId;
  reviewTimestamp?: Date;
  status: ETransactionStatus;
  statusHistory: {
    status: ETransactionStatus;
    timestamp: Date;
    reviewer?: mongoose.Types.ObjectId;
  }[];
}

export interface ComplianceTransactionDocument extends IComplianceTransaction, Document { }

const ComplianceTransactionSchema = new Schema<ComplianceTransactionDocument>(
  {
    txId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      trim: true
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    approvedAt: {
      type: Date,
      required: false
    },

    clientId: {
      type: String,
      required: [true, 'Client ID is required'],
      trim: true
    },
    monitoredAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'MonitoredAddress',
      required: [true, 'Monitored address ID is required']
    },
    counterpartyEntities: {
      type: [String],
      trim: true
    },
    blockchain: {
      type: String,
      required: [true, 'Blockchain is required'],
      trim: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required']
    },
    timestamp: {
      type: Date,
      required: [true, 'Timestamp is required']
    },
    riskScores: {
      type: [Number],
      required: [true, 'Risk scores are required'],
      min: 0,
      max: 100
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: false
    },
    notes: {
      type: String,
      trim: true
    },


    sarSubmitted: {
      type: Boolean,
      default: false
    },
    sarReport: {
      type: Schema.Types.ObjectId,
      ref: 'SARReport',
      required: false,
      default: null
    },

    reviewerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    reviewTimestamp: {
      type: Date,
      required: false
    },
    status: {
      type: String,
      enum: Object.values(ETransactionStatus),
      default: ETransactionStatus.UNASSIGNED,
      required: [true, 'Status is required']
    },

    statusHistory: {
      type: [{
        status: {
          type: String,
          enum: Object.values(ETransactionStatus),
          required: true
        },
        timestamp: {
          type: Date,
          required: true
        },
        reviewer: {
          type: Schema.Types.ObjectId,
          ref: 'User'
        }
      }],
      default: []
    },
  },
  {
    timestamps: true
  }
);

// Create indexes for common queries
ComplianceTransactionSchema.index({ transactionId: 1 });
ComplianceTransactionSchema.index({ monitoredAddressId: 1 });
ComplianceTransactionSchema.index({ blockchain: 1 });
ComplianceTransactionSchema.index({ timestamp: -1 });
ComplianceTransactionSchema.index({ riskScore: 1 });
ComplianceTransactionSchema.index({ status: 1 });
ComplianceTransactionSchema.index({ organizationId: 1 });
ComplianceTransactionSchema.index({ createdBy: 1 });

export default ComplianceTransactionSchema;
