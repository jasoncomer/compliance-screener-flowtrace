import mongoose from 'mongoose';

export interface ISubscriptionTier {
  id: TierId;
  name: string;
  description: string;
  prices: IPrice[];
  features: ITierFeatures;
  isActive: boolean;
  sortOrder: number;
  isPopular?: boolean;
  isLegacy?: boolean;
}

export interface IPrice {
  amount: number;
  currency: 'USD' | 'EUR' | 'GBP';
  billingPeriod: 'monthly' | 'yearly';
}

export interface ITierFeatures {
  maxMembers: number;
  maxOrganizations: number;
  allowCSAM: boolean;
  maxTransactionsPerMonth: number;
  support: 'email' | 'priority' | '24/7';
  customBranding: boolean;
  apiAccess: boolean;
  dataRetentionMonths: number;
}

export type TierId = 'free' | 'starter' | 'growth' | 'custom';



// Subscription status enum
export enum ESubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  TRIAL = 'trial',
  UNPAID = 'unpaid',
}

// Define organization subscription with TierId type
export interface IOrganizationSubscription {
  _id?: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  tierId: TierId;
  billingPeriod: 'monthly' | 'yearly';
  status: ESubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
