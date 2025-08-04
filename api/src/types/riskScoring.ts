import { SOTV2 } from '@src/models';

// Base type for measuring any kind of risk
interface RiskFactor {
  id: string; // Unique identifier for the risk factor
  score: number;
  severity: 'high' | 'medium' | 'low';
  description: string;
  details?: Record<string, any>;
}

// Specific risk types extend the base RiskFactor
interface EntityRiskFactor extends RiskFactor {
  entityType: string;
  tags: string[];
  modifiers: Array<{
    type: string;
    impact: number | 'Maximum';
  }>;
}

interface JurisdictionRiskFactor extends RiskFactor {
  countries: string[];
  individualScores: number[];
}

interface TransactionRiskFactor extends RiskFactor {
  type: 'amount' | 'sender' | 'receiver' | 'pattern' | 'timing';
  hops?: Array<{
    txHash: string;
    riskScore: number;
    hopLevel: number;
    weight: number;
  }>;
}

// Historical data point
interface RiskDataPoint {
  date: string;
  score: number;
}

// Entity metadata
interface EntityMetadata {
  no_kyc_required: boolean;
  centralized: boolean;
  active: boolean;
  year_founded?: string;
  contacts?: {
    email?: string;
    phone?: string;
    address?: string;
    social?: {
      twitter?: string;
      telegram?: string;
    };
  };
}

// Risk factor collections
interface RiskFactorCollection<T extends RiskFactor> {
  factors: T[];
  aggregateScore: number;
}

// Alternative record-based collection
interface RiskFactorRecord<T extends RiskFactor> {
  byId: Record<string, T>;
  aggregateScore: number;
}

// Main risk scoring response
interface RiskScoringResponse {
  // You can choose either array-based or record-based collections
  entityRisk: RiskFactorCollection<EntityRiskFactor>;
  jurisdictionRisk: RiskFactorCollection<JurisdictionRiskFactor>;
  transactionRisk: RiskFactorCollection<TransactionRiskFactor>;

  // Alternative record-based structure:
  // entityRisk: RiskFactorRecord<EntityRiskFactor>;
  // jurisdictionRisk: RiskFactorRecord<JurisdictionRiskFactor>;
  // transactionRisk: RiskFactorRecord<TransactionRiskFactor>;

  overallRisk: number;
  analysisType: 'address' | 'transaction';

  sot: SOTV2 | null;
}

// Configuration for risk scoring
interface RiskScoringConfig {
  weights: {
    jurisdiction: number;
    entity: number;
    transaction: number;
  };
  maxHops: number;
  hopWeightDecay: number;
}

// Transaction information
interface TransactionInfo {
  txHash: string;
  from: string;
  to: string;
  value: string;
  timestamp: string;
  blockNumber: number;
  gasUsed: number;
  gasPrice: string;
  status: 'success' | 'failed';
  riskFactors: {
    amount: RiskFactor;
    sender: RiskFactor;
    receiver: RiskFactor;
    pattern: RiskFactor;
    timing: RiskFactor;
  };
}

export type {
  EntityMetadata,
  EntityRiskFactor,
  JurisdictionRiskFactor,
  RiskDataPoint,
  RiskFactor,
  RiskFactorCollection,
  RiskFactorRecord,
  RiskScoringConfig,
  RiskScoringResponse,
  TransactionInfo,
  TransactionRiskFactor,
};
