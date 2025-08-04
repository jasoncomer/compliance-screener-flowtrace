import { Schema, model, Document } from 'mongoose';

export interface IDistributedLock extends Document {
  lockKey: string;
  lockedBy: string;
  lockedAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

const distributedLockSchema = new Schema<IDistributedLock>(
  {
    lockKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    lockedBy: {
      type: String,
      required: true
    },
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// TTL index to automatically clean up expired locks
distributedLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const DistributedLockModel = model<IDistributedLock>('DistributedLock', distributedLockSchema);