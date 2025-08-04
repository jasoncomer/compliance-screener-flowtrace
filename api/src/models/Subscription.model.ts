import { Schema, Document, Model } from 'mongoose';
import { IOrganizationSubscription as ISubscription, ESubscriptionStatus, TierId } from '@src/interfaces/subscription';

export interface ISubscriptionDocument extends Omit<ISubscription, '_id'>, Document {
  // Add any document methods here if needed
}

export type ISubscriptionModel = Model<ISubscriptionDocument>

export const SubscriptionSchema = new Schema<
  ISubscriptionDocument,
  ISubscriptionModel
>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    tierId: {
      type: String,
      required: [true, 'Tier ID is required'],
      index: true,
    },
    billingPeriod: {
      type: String,
      enum: ['monthly', 'yearly'],
      required: [true, 'Billing period is required'],
      default: 'monthly',
    },
    status: {
      type: String,
      enum: Object.values(ESubscriptionStatus),
      required: true,
      default: ESubscriptionStatus.TRIAL,
    },
    stripeCustomerId: {
      type: String,
      required: false,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      required: false,
      sparse: true,
    },
    currentPeriodStart: {
      type: Date,
      required: true,
      default: Date.now,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
      default: () => {
        const now = new Date();
        return new Date(now.setMonth(now.getMonth() + 1)); // Default to 1 month from now
      },
    },
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
    trialStart: {
      type: Date,
      required: false,
    },
    trialEnd: {
      type: Date,
      required: false,
    },
    canceledAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient tier-based queries
SubscriptionSchema.index({ tierId: 1 });
SubscriptionSchema.index({ organizationId: 1, tierId: 1 });

// Add validation for tier ID
SubscriptionSchema.pre('save', function (next) {
  // Use lazy import to avoid circular dependency
  import('@src/configs/tier-config').then(({ TierManager }) => {
    if (!TierManager.isValidTierId(this.tierId)) {
      return next(new Error(`Invalid tier ID: ${this.tierId}`));
    }

    if (!TierManager.isTierActive(this.tierId as TierId)) {
      return next(new Error(`Tier is not active: ${this.tierId}`));
    }

    next();
  }).catch(next);
});

export default SubscriptionSchema; 