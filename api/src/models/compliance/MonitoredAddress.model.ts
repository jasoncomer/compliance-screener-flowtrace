import mongoose, { Schema, Document } from 'mongoose';

export type MonitoredAddressStatus = 'active' | 'inactive' | 'pending_review' | 'suspended' | 'archived';

export interface IMonitoredAddress {
  address: string;
  blockchain: string;
  clientId: string;
  organizationId: mongoose.Types.ObjectId;
  notes?: string;
  isActive: boolean;
}

export interface MonitoredAddressDocument extends IMonitoredAddress, Document { }

const MonitoredAddressSchema = new Schema<MonitoredAddressDocument>(
  {
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    blockchain: {
      type: String,
      required: false,
      trim: true,
      default: 'bitcoin',
    },
    clientId: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      required: false,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create a compound index to ensure uniqueness of address within an organization and blockchain
MonitoredAddressSchema.index(
  { address: 1, organizationId: 1 },
  { unique: true, sparse: true }
);

// Create indexes for common queries
MonitoredAddressSchema.index({ address: 1 });
MonitoredAddressSchema.index({ organizationId: 1 });



export default MonitoredAddressSchema;
