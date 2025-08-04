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

  private spreadsheetService: GoogleSheetsService;
  private readonly CACHE_TTL = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.spreadsheetService = new GoogleSheetsService(googleSheetsConfig.sot.spreadsheetId);
  }

  private async loadDataFromSheet() {
    try {
      // Load data from all relevant sheets
      const dropdownRows = await this.spreadsheetService.getRows(countryRiskSheetName);
      const entityTypeRows = await this.spreadsheetService.getRows(entityTypeSheetName);

      // Clear existing cache
      this.cache.entityTypeRiskScores.clear();
      this.cache.entityTypeRecoveryProbabilities.clear();
      this.cache.countryRiskScores.clear();
      this.cache.fatfStatus.clear();

      // Process jurisdiction_master_list data
      for (const row of dropdownRows) {
        // Process country risk scores and FATF status
        const country = row.get('country_of_operations');
        const riskScore = 100 - parseFloat(row.get('country_risk_score'));
        const fatfBlack = row.get('fatf_black') === 'TRUE';
        const fatfGray = row.get('fatf_gray') === 'TRUE';
        const fatfAml = row.get('fatf_aml');

        if (country) {
          if (!isNaN(riskScore)) {
            this.cache.countryRiskScores.set(country, riskScore);
          }
          this.cache.fatfStatus.set(country, {
            black: fatfBlack,
            gray: fatfGray,
          });
        }
      }

      // Process entity_type_master_list data
      for (const row of entityTypeRows) {
        let entityType = row.get('entity_type') || '';
        if (!entityType) continue;
        entityType = entityType.trim();

        const entityTypeRiskScore = parseFloat(row.get('risk_score_type'));
        if (entityType && !isNaN(entityTypeRiskScore)) {
          this.cache.entityTypeRiskScores.set(entityType, entityTypeRiskScore);
        }
        const entityTypeLogo = row.get('entity_type_default_logo');
        if (entityTypeLogo) {
          this.cache.entityTypeLogos.set(entityType, entityTypeLogo);
        }

        const recoveryProb = row.get('recovery_chance');
        if (entityType && recoveryProb) {
          this.cache.entityTypeRecoveryProbabilities.set(entityType, recoveryProb);
        }
      }

      this.cache.lastUpdated = new Date();
      console.log('Risk scoring data cache updated successfully');
    } catch (error) {
      console.error('Error loading risk scoring data:', error);
      throw error;
    }
  }

  private async ensureCacheValid() {
    const now = new Date();
    if (now.getTime() - this.cache.lastUpdated.getTime() > this.CACHE_TTL) {
      await this.loadDataFromSheet();
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
    await this.loadDataFromSheet();
  }
}

// Export singleton instance
export const riskScoringDataService = new RiskScoringDataService(); 