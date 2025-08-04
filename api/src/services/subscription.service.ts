import mongoose from 'mongoose';
import Stripe from 'stripe';

import { environmentConfig } from '@src/configs';
import { ESubscriptionStatus, TierId } from '@src/interfaces/subscription';
import { TierManager } from '@src/configs/tier-config';
import { modelFactory } from '@src/db/modelFactory';

const stripe = new Stripe(environmentConfig.STRIPE_SECRET_KEY as string, {
  apiVersion: '2022-11-15',
  typescript: true,
});

// Custom error classes
export class SubscriptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubscriptionError';
  }
}

export class SubscriptionNotFoundError extends SubscriptionError {
  constructor(message = 'Subscription not found') {
    super(message);
    this.name = 'SubscriptionNotFoundError';
  }
}

export class TierNotFoundError extends SubscriptionError {
  constructor(message = 'Subscription tier not found') {
    super(message);
    this.name = 'TierNotFoundError';
  }
}

export class DuplicateSubscriptionError extends SubscriptionError {
  constructor(message = 'Organization already has a subscription') {
    super(message);
    this.name = 'DuplicateSubscriptionError';
  }
}

/**
 * Get all available subscription tiers
 */
export const getSubscriptionTiersService = async () => {
  try {
    return TierManager.getPublicTiers();
  } catch (error) {
    throw new SubscriptionError('Failed to retrieve subscription tiers');
  }
};

/**
 * Get a specific organization's current subscription
 * If no subscription exists, automatically create a trial subscription
 */
export const getOrganizationSubscriptionService = async (organizationId: string) => {
  try {
    const OrganizationSubscription = await modelFactory.getModel('OrganizationSubscription');
    let subscription = await OrganizationSubscription.findOne({ organizationId });

    if (!subscription) {
      // Automatically create a trial subscription with a default trial tier
      // Using 'growth' tier as the default trial tier (you can adjust this based on your business logic)
      const defaultTrialTierId: TierId = 'starter';

      // Validate the trial tier exists and is active
      const trialTier = TierManager.getTierById(defaultTrialTierId);
      if (!trialTier) {
        throw new TierNotFoundError(`Default trial tier not found: ${defaultTrialTierId}`);
      }

      if (!TierManager.isTierActive(defaultTrialTierId)) {
        throw new TierNotFoundError(`Default trial tier is not active: ${defaultTrialTierId}`);
      }

      // Create a trial subscription
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial period

      subscription = await OrganizationSubscription.create({
        organizationId,
        tierId: defaultTrialTierId,
        status: ESubscriptionStatus.TRIAL,
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
        trialStart: trialStart,
        trialEnd: trialEnd,
      });
    }

    // Get tier information from config
    const tier = TierManager.getTierById(subscription.tierId as TierId);
    if (!tier) {
      throw new TierNotFoundError(`Tier not found: ${subscription.tierId}`);
    }

    return {
      ...subscription.toObject(),
      tier
    };
  } catch (error) {
    if (error instanceof SubscriptionError) {
      throw error;
    }
    throw new SubscriptionError('Failed to retrieve organization subscription');
  }
};

/**
 * Create a new subscription for an organization
 */
export const createOrganizationSubscriptionService = async (data: { organizationId: string; tierId: TierId; billingPeriod: 'monthly' | 'yearly' }) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organizationId, tierId, billingPeriod } = data;
    const OrganizationSubscription = await modelFactory.getModel('OrganizationSubscription');

    // Check if organization already has a subscription
    const existingSubscription = await OrganizationSubscription.findOne({ organizationId });
    if (existingSubscription) {
      throw new DuplicateSubscriptionError();
    }

    // Validate the tier exists and is active
    const tier = TierManager.getTierById(tierId);
    if (!tier) {
      throw new TierNotFoundError(`Tier not found: ${tierId}`);
    }

    if (!TierManager.isTierActive(tierId)) {
      throw new TierNotFoundError(`Tier is not active: ${tierId}`);
    }

    // Validate the billing period exists for this tier
    const priceForPeriod = tier.prices.find(p => p.billingPeriod === billingPeriod);
    if (!priceForPeriod) {
      throw new TierNotFoundError(`Billing period ${billingPeriod} not available for tier ${tierId}`);
    }

    // Create a trial subscription by default (or use the tier's default if it's free)
    const isFree = priceForPeriod.amount === 0;
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial period

    // Create the subscription
    const subscription = await OrganizationSubscription.create({
      organizationId,
      tierId,
      billingPeriod,
      status: isFree ? ESubscriptionStatus.ACTIVE : ESubscriptionStatus.TRIAL,
      currentPeriodStart: trialStart,
      currentPeriodEnd: isFree ? new Date('2099-12-31') : trialEnd, // Free tiers don't expire
      trialStart: isFree ? undefined : trialStart,
      trialEnd: isFree ? undefined : trialEnd,
    });

    await session.commitTransaction();
    session.endSession();

    return {
      ...subscription.toObject(),
      tier
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    if (error instanceof SubscriptionError) {
      throw error;
    }
    throw new SubscriptionError('Failed to create organization subscription');
  }
};

/**
 * Upgrade/downgrade an organization's subscription
 */
export const updateOrganizationSubscriptionService = async (
  organizationId: string,
  data: { tierId: TierId; billingPeriod: 'monthly' | 'yearly' }
) => {
  const { tierId, billingPeriod } = data;
  const OrganizationSubscription = await modelFactory.getModel('OrganizationSubscription');

  try {
    // Get the current subscription
    const subscription = await OrganizationSubscription.findOne({ organizationId });
    if (!subscription) {
      throw new SubscriptionNotFoundError('Subscription not found for this organization');
    }

    // Validate the new tier
    const newTier = TierManager.getTierById(tierId);
    if (!newTier) {
      throw new TierNotFoundError(`Tier not found: ${tierId}`);
    }

    if (!TierManager.isTierActive(tierId)) {
      throw new TierNotFoundError(`Tier is not active: ${tierId}`);
    }

    // Validate the billing period exists for this tier
    const priceForPeriod = newTier.prices.find(p => p.billingPeriod === billingPeriod);
    if (!priceForPeriod) {
      throw new TierNotFoundError(`Billing period ${billingPeriod} not available for tier ${tierId}`);
    }

    // Check if it's an upgrade or downgrade
    const changeType = TierManager.compareTiers(subscription.tierId as TierId, tierId);

    // If subscription has a Stripe subscription ID, update it in Stripe
    if (subscription.stripeSubscriptionId) {
      // Update the subscription in Stripe
      // Implementation will depend on your exact Stripe setup
    }

    // Update the subscription in the database
    subscription.tierId = tierId;
    subscription.billingPeriod = billingPeriod;

    // If moving to a free tier, make it active immediately
    if (priceForPeriod.amount === 0) {
      subscription.status = ESubscriptionStatus.ACTIVE;
      subscription.currentPeriodEnd = new Date('2099-12-31');
    }

    await subscription.save();

    return {
      ...subscription.toObject(),
      tier: newTier,
      changeType
    };
  } catch (error) {
    if (error instanceof SubscriptionError) {
      throw error;
    }
    throw new SubscriptionError('Failed to update organization subscription');
  }
};

/**
 * Cancel an organization's subscription
 */
export const cancelOrganizationSubscriptionService = async (
  organizationId: string,
  data: { cancelImmediately: boolean }
) => {
  const { cancelImmediately } = data;
  const OrganizationSubscription = await modelFactory.getModel('OrganizationSubscription');

  try {
    // Get the current subscription
    const subscription = await OrganizationSubscription.findOne({ organizationId });
    if (!subscription) {
      throw new SubscriptionNotFoundError('Subscription not found for this organization');
    }

    // If subscription has a Stripe subscription ID, cancel it in Stripe
    if (subscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: !cancelImmediately,
      });

      if (cancelImmediately) {
        await stripe.subscriptions.del(subscription.stripeSubscriptionId);
      }
    }

    // Update the subscription in the database
    if (cancelImmediately) {
      subscription.status = ESubscriptionStatus.CANCELED;
      subscription.canceledAt = new Date();
      // Downgrade to free tier
      subscription.tierId = 'free';
    } else {
      subscription.cancelAtPeriodEnd = true;
    }

    await subscription.save();

    const tier = TierManager.getTierById(subscription.tierId as TierId);

    return {
      subscription: {
        ...subscription.toObject(),
        tier
      },
      message: cancelImmediately
        ? 'Subscription canceled immediately and downgraded to free tier'
        : 'Subscription will be canceled at the end of the billing period'
    };
  } catch (error) {
    if (error instanceof SubscriptionError) {
      throw error;
    }
    throw new SubscriptionError('Failed to cancel organization subscription');
  }
};

/**
 * Check limits for an organization's tier
 * This is an internal service function to be used within other services
 */
export const checkOrganizationTierLimits = async (
  organizationId: string,
  limitType: 'maxMembers' | 'maxOrganizations' | 'maxTransactionsPerMonth'
): Promise<{ allowed: boolean; limit: number; current: number; tierName: string }> => {
  try {
    // Get the organization's subscription
    const OrganizationSubscription = await modelFactory.getModel('OrganizationSubscription');
    const subscription = await OrganizationSubscription.findOne({ organizationId });

    if (!subscription) {
      // If no subscription exists, use the default free tier
      const defaultTier = TierManager.getDefaultTier();
      const limit = defaultTier.features[limitType] as number;
      return { allowed: false, limit, current: 0, tierName: defaultTier.name };
    }

    // Get the tier information from config
    const tier = TierManager.getTierById(subscription.tierId as TierId);
    if (!tier) {
      // Fallback to default tier if subscription has invalid tier ID
      const defaultTier = TierManager.getDefaultTier();
      const limit = defaultTier.features[limitType] as number;
      return { allowed: false, limit, current: 0, tierName: defaultTier.name };
    }

    const limit = tier.features[limitType] as number;

    // Initialize variables outside switch for scope reasons
    let current = 0;
    let User;
    let Organization;
    let ComplianceTransaction;
    let now;
    let firstDayOfMonth;

    // Calculate current usage (implementation will vary based on the limit type)
    switch (limitType) {
      case 'maxMembers':
        // Calculate current member count
        User = await modelFactory.getModel('User');
        current = await User.countDocuments({ organizationId });
        break;
      case 'maxOrganizations':
        // Calculate current organization count
        Organization = await modelFactory.getModel('Organization');
        current = await Organization.countDocuments({ ownerId: organizationId });
        break;
      case 'maxTransactionsPerMonth':
        // Calculate current transaction count for the current month
        ComplianceTransaction = await modelFactory.getModel('ComplianceTransaction');
        now = new Date();
        firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        current = await ComplianceTransaction.countDocuments({
          organizationId,
          createdAt: { $gte: firstDayOfMonth }
        });
        break;
    }

    // Check if the limit is reached
    const allowed = current < limit;

    return { allowed, limit, current, tierName: tier.name };
  } catch (error) {
    console.error('Error checking tier limits:', error);
    // Default to allowed if there's an error (avoid blocking users due to system errors)
    const defaultTier = TierManager.getDefaultTier();
    const limit = defaultTier.features[limitType] as number;
    return { allowed: true, limit, current: 0, tierName: defaultTier.name };
  }
}; 