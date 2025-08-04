import mongoose, { Schema, Document } from 'mongoose';

export interface MonitoredAddressChange {
  monitoredAddressId: mongoose.Types.ObjectId;
  changeType: 'create' | 'update' | 'delete' | 'status_change';
  fieldName?: string;
  oldValue?: string | number | boolean | string[] | Record<string, any>;
  newValue?: string | number | boolean | string[] | Record<string, any>;
  notes?: string;
  changedById: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  timestamp: Date;
}

export interface MonitoredAddressChangeDocument extends MonitoredAddressChange, Document { }

const MonitoredAddressChangeSchema = new Schema<MonitoredAddressChangeDocument>(
  {
    monitoredAddressId: {
      type: Schema.Types.ObjectId,
      ref: 'MonitoredAddress',
      required: [true, 'Monitored address ID is required'],
      index: true
    },
    changeType: {
      type: String,
      enum: ['create', 'update', 'delete', 'status_change'],
      required: [true, 'Change type is required'],
      index: true
    },
    fieldName: {
      type: String,
      trim: true,
      index: true
    },
    oldValue: {
      type: Schema.Types.Mixed
    },
    newValue: {
      type: Schema.Types.Mixed
    },
    notes: {
      type: String,
      trim: true,
      required: false
    },
    changedById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID who made the change is required'],
      index: true
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: [true, 'Timestamp is required'],
      index: true
    }
  },
  {
    timestamps: false
  }
);

// Create indexes for common queries
MonitoredAddressChangeSchema.index({ monitoredAddressId: 1 });
MonitoredAddressChangeSchema.index({ changedById: 1 });
MonitoredAddressChangeSchema.index({ organizationId: 1 });
MonitoredAddressChangeSchema.index({ timestamp: -1 });
MonitoredAddressChangeSchema.index({ changeType: 1 });

export default MonitoredAddressChangeSchema; 