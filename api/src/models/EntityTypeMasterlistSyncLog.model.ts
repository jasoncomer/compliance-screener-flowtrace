import { Document, Schema } from 'mongoose';

export interface EntityTypeMasterlistSyncLog {
  timestamp: Date;
  success: boolean;
  message: string;
  count: number;
  error?: string;
}

export interface EntityTypeMasterlistSyncLogDocument extends EntityTypeMasterlistSyncLog, Document { }

export const EntityTypeMasterlistSyncLogSchema = new Schema<EntityTypeMasterlistSyncLog>({
  timestamp: { type: Date, required: true, default: Date.now },
  success: { type: Boolean, required: true },
  message: { type: String, required: true },
  count: { type: Number, required: true },
  error: { type: String, required: false }
}, {
  timestamps: true
}); 