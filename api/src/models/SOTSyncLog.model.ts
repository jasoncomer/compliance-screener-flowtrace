import { Document, Schema } from 'mongoose';

export interface SOTSyncLog {
  timestamp: Date;
  success: boolean;
  message: string;
  count: number;
  error?: string;
}

export interface SOTSyncLogDocument extends SOTSyncLog, Document { }

export const SOTSyncLogSchema = new Schema<SOTSyncLog>({
  timestamp: { type: Date, required: true, default: Date.now },
  success: { type: Boolean, required: true },
  message: { type: String, required: true },
  count: { type: Number, required: true },
  error: { type: String, required: false }
}, {
  timestamps: true
});