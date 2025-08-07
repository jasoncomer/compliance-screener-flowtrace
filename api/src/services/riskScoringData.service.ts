import { GoogleSheetsService } from './googleSheets.service';
import { googleSheetsConfig } from '@src/configs/googleSheets.config';


interface RiskScoringCache {
  entityTypeRiskScores: Map<string, number>;
  entityTypeRecoveryProbabilities: Map<string, string>;
  entityTypeLogos: Map<string, string>;
  countryRiskScores: Map<string, number>;
  fatfStatus: Map<string, { black: boolean; gray: boolean; }>;
  lastUpdated: Date;
}

const countryRiskSheetName = 'jurisdiction_master_list';
const entityTypeSheetName = 'entity_type_master_list';
const GLOBAL_RISK = 35.99;


class RiskScoringDataService {
  private cache: RiskScoringCache = {
    entityTypeRiskScores: new Map(),
    entityTypeRecoveryProbabilities: new Map(),
    entityTypeLogos: new Map(),
    countryRiskScores: new Map(),
    fatfStatus: new Map(),
    lastUpdated: new Date(0)
  };

  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor() {
    // No Google Sheets service initialization
  }

  private async loadDataFromMongoDB() {
    try {
      const { fetchAllEntityTypeMasterlist } = await import('./entityTypeMasterlist.service');
      const entityTypes = await fetchAllEntityTypeMasterlist();

      // Clear existing cache
      this.cache.entityTypeRiskScores.clear();
      this.cache.entityTypeRecoveryProbabilities.clear();
      this.cache.entityTypeLogos.clear();
      this.cache.countryRiskScores.clear();
      this.cache.fatfStatus.clear();

      // Process entity type data from MongoDB
      for (const entity of entityTypes) {
        const entityType = entity.entity_type;
        if (entityType) {
          if (entity.risk_score_type !== undefined) {
            this.cache.entityTypeRiskScores.set(entityType, entity.risk_score_type);
          }
          if (entity.recovery_chance) {
            this.cache.entityTypeRecoveryProbabilities.set(entityType, entity.recovery_chance);
          }
          if (entity.entity_type_default_logo) {
            this.cache.entityTypeLogos.set(entityType, entity.entity_type_default_logo);
          }
        }
      }

      // Placeholder for country risk data - could be loaded from another MongoDB collection if available
      // For now, using default values
      console.log('Country risk data not loaded from MongoDB, using default values');

      this.cache.lastUpdated = new Date();
      console.log('Risk scoring data cache updated successfully from MongoDB');
    } catch (error) {
      console.error('Error loading risk scoring data from MongoDB:', error);
      throw error;
    }
  }

  private async ensureCacheValid() {
    const now = new Date();
    if (now.getTime() - this.cache.lastUpdated.getTime() > this.CACHE_TTL) {
      await this.loadDataFromMongoDB();
    }
  }

  /** Returns the risk score for a jurisdiction in the range 0-100 */
  public async getJurisdictionRisk(country: string): Promise<number> {
    await this.ensureCacheValid();
    let baseRisk = this.cache.countryRiskScores.get(country) || GLOBAL_RISK; // Default global average

    // Apply FATF status modifiers
    const fatfStatus = this.cache.fatfStatus.get(country);
    if (fatfStatus) {
      if (fatfStatus.black) baseRisk = Math.min(baseRisk + 30, 100);
      if (fatfStatus.gray) baseRisk = Math.min(baseRisk + 15, 100);
    }

    return baseRisk;
  }

  public async getAllJurisdictionRisks(): Promise<Map<string, number>> {
    await this.ensureCacheValid();
    return new Map(this.cache.countryRiskScores);
  }

  public async getEntityTypeRisk(entityType: string): Promise<number> {
    await this.ensureCacheValid();
    const risk = this.cache.entityTypeRiskScores.get(entityType) || GLOBAL_RISK;
    return risk;
  }


  public async getAllEntityTypeRisks(): Promise<Map<string, number>> {
    await this.ensureCacheValid();
    return new Map(this.cache.entityTypeRiskScores);
  }

  public async getFATFStatus(country: string): Promise<{ black: boolean; gray: boolean; } | undefined> {
    await this.ensureCacheValid();
    return this.cache.fatfStatus.get(country);
  }

  public async getEntityTypeRecoveryProbability(entityType: string): Promise<string | undefined> {
    await this.ensureCacheValid();
    return this.cache.entityTypeRecoveryProbabilities.get(entityType);
  }

  public async refreshCache(): Promise<void> {
    await this.loadDataFromMongoDB();
  }
}

// Export singleton instance
export const riskScoringDataService = new RiskScoringDataService(); 