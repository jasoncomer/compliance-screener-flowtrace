/**
 * Subscription Tiers Configuration
 * 
 * This module defines all available subscription tiers and provides
 * utility functions for tier management and validation.
*/
import { ISubscriptionTier, ITierFeatures, TierId } from "@src/interfaces/subscription";

/**
 * Default subscription tiers configuration
 */
export const SUBSCRIPTION_TIERS: ISubscriptionTier[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic tier with limited features',
    prices: [
      { amount: 0, currency: 'USD', billingPeriod: 'monthly' },
      { amount: 0, currency: 'USD', billingPeriod: 'yearly' }
    ],
    features: {
      maxMembers: 1,
      maxOrganizations: 1,
      allowCSAM: false,
      maxTransactionsPerMonth: 100,
      support: 'email',
      customBranding: false,
      apiAccess: false,
      dataRetentionMonths: 1,
    },
    isActive: false,
    sortOrder: 0,
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individuals and small teams getting started',
    prices: [
      { amount: 299, currency: 'USD', billingPeriod: 'monthly' },
      { amount: 2990, currency: 'USD', billingPeriod: 'yearly' }
    ],
    features: {
      maxMembers: 1,
      maxOrganizations: 1,
      allowCSAM: true,
      maxTransactionsPerMonth: 1000,
      support: 'email',
      customBranding: false,
      apiAccess: false,
      dataRetentionMonths: 2,
    },
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Full-featured solution for large organizations',
    prices: [
      { amount: 999, currency: 'USD', billingPeriod: 'monthly' },
      { amount: 9990, currency: 'USD', billingPeriod: 'yearly' }
    ],
    features: {
      maxMembers: 3,
      maxOrganizations: 1,
      allowCSAM: true,
      maxTransactionsPerMonth: 100000,
      support: '24/7',
      customBranding: true,
      apiAccess: true,
      dataRetentionMonths: 24,
    },
    isActive: true,
    sortOrder: 30,
    isPopular: true,
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Tailored solution for organizations with specific requirements',
    prices: [
      { amount: 1999, currency: 'USD', billingPeriod: 'monthly' },
      { amount: 0, currency: 'USD', billingPeriod: 'yearly' } // 0 means "Contact Sales" for yearly
    ],
    features: {
      maxMembers: 100,
      maxOrganizations: 10,
      allowCSAM: true,
      maxTransactionsPerMonth: 1000000,
      support: '24/7',
      customBranding: true,
      apiAccess: true,
      dataRetentionMonths: 60,
    },
    isActive: true,
    sortOrder: 40,
  },
];

/**
 * Tier Management Utilities
 */
export class TierManager {
  private static tiers = SUBSCRIPTION_TIERS;

  /**
   * Get all tiers
   */
  static getAllTiers(): ISubscriptionTier[] {
    return [...this.tiers];
  }

  /**
   * Get only active tiers, sorted by sort order
   */
  static getActiveTiers(): ISubscriptionTier[] {
    return this.tiers
      .filter(tier => tier.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get tiers available for public display (active, non-legacy)
   */
  static getPublicTiers(): ISubscriptionTier[] {
    return this.tiers
      .filter(tier => tier.isActive && !tier.isLegacy)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Find a tier by ID
   */
  static getTierById(id: TierId): ISubscriptionTier | undefined {
    return this.tiers.find(tier => tier.id === id);
  }

  /**
   * Find a tier by name
   */
  static getTierByName(name: string): ISubscriptionTier | undefined {
    return this.tiers.find(tier => tier.name.toLowerCase() === name.toLowerCase());
  }

  /**
   * Check if a tier ID is valid
   */
  static isValidTierId(id: string): id is TierId {
    return this.tiers.some(tier => tier.id === id);
  }

  /**
   * Check if a tier is active
   */
  static isTierActive(id: TierId): boolean {
    const tier = this.getTierById(id);
    return tier ? tier.isActive : false;
  }

  /**
   * Get the default tier (usually free)
   */
  static getDefaultTier(): ISubscriptionTier {
    return this.getTierById('free') || this.getActiveTiers()[0];
  }

  /**
   * Get the trial tier
   */
  static getTrialTier(): ISubscriptionTier | undefined {
    return this.getTierById('starter');
  }

  /**
   * Get tiers by billing period
   */
  static getTiersByBillingPeriod(period: 'monthly' | 'yearly'): ISubscriptionTier[] {
    return this.getActiveTiers().filter(tier => tier.prices.some(price => price.billingPeriod === period));
  }

  /**
   * Get popular tiers
   */
  static getPopularTiers(): ISubscriptionTier[] {
    return this.getActiveTiers().filter(tier => tier.isPopular);
  }

  /**
   * Get free tiers (amount = 0)
   */
  static getFreeTiers(): ISubscriptionTier[] {
    return this.getActiveTiers().filter(tier => tier.prices.some(price => price.amount === 0));
  }

  /**
   * Get paid tiers (amount > 0)
   */
  static getPaidTiers(): ISubscriptionTier[] {
    return this.getActiveTiers().filter(tier => tier.prices.some(price => price.amount > 0));
  }

  /**
   * Compare two tiers to determine upgrade/downgrade
   */
  static compareTiers(fromTierId: TierId, toTierId: TierId): 'upgrade' | 'downgrade' | 'same' | 'invalid' {
    const fromTier = this.getTierById(fromTierId);
    const toTier = this.getTierById(toTierId);

    if (!fromTier || !toTier) return 'invalid';
    if (fromTier.id === toTier.id) return 'same';

    // Compare based on sort order (lower = basic, higher = premium)
    if (toTier.sortOrder > fromTier.sortOrder) return 'upgrade';
    return 'downgrade';
  }

  /**
   * Get tier feature by limit type
   */
  static getTierLimit(tierId: TierId, limitType: keyof ITierFeatures): number | boolean | string | undefined {
    const tier = this.getTierById(tierId);
    return tier ? tier.features[limitType] : undefined;
  }

  /**
   * Validate tier configuration on startup
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicate IDs
    const ids = this.tiers.map(t => t.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate tier IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check for duplicate names
    const names = this.tiers.map(t => t.name);
    const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicateNames.length > 0) {
      errors.push(`Duplicate tier names found: ${duplicateNames.join(', ')}`);
    }

    // Check for missing default tier
    if (!this.getTierById('free')) {
      errors.push('No "free" tier found - this is required as the default tier');
    }

    // Validate sort orders are unique
    const sortOrders = this.tiers.map(t => t.sortOrder);
    const duplicateSortOrders = sortOrders.filter((order, index) => sortOrders.indexOf(order) !== index);
    if (duplicateSortOrders.length > 0) {
      errors.push(`Duplicate sort orders found: ${duplicateSortOrders.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Initialize and validate tier configuration
 */
export const initializeTierSystem = (): void => {
  const validation = TierManager.validateConfiguration();
  if (!validation.isValid) {
    console.error('Subscription tier configuration errors:');
    validation.errors.forEach(error => console.error(`- ${error}`));
    throw new Error('Invalid subscription tier configuration');
  }
  console.log('Subscription tier system initialized successfully');
}; 