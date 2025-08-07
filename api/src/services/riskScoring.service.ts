import { riskScoringDataService } from './riskScoringData.service';
import * as blockchainService from './blockchain.service';
import * as sotService from './sot.service';
import { fetchAttributions } from './attribution.service';
import { BtcTransaction, SOTV2 } from '@src/models';
import { RiskScoringResponse, EntityRiskFactor, JurisdictionRiskFactor, TransactionRiskFactor, RiskFactorCollection, TransactionInfo, RiskScoringConfig } from '@src/types/riskScoring';
import { modelFactory } from '@src/db/modelFactory';

export class RiskScoringService {
  private config: RiskScoringConfig = {
    weights: {
      jurisdiction: 0.4,
      entity: 0.4,
      transaction: 0.2
    },
    maxHops: 3,
    hopWeightDecay: 0.5
  };

  /** Returns the risk score for a jurisdiction in the range 0-1 */
  private async calculateJurisdictionRisk(countries: string[]): Promise<RiskFactorCollection<JurisdictionRiskFactor>> {
    const factors: JurisdictionRiskFactor[] = [];

    // If there are no countries, return default risk
    if (!countries.length) {
      return {
        factors: [],
        aggregateScore: 0.36 // Default risk score
      };
    }

    // Fetch all jurisdiction risks in a single batch
    const allJurisdictionRisks = await riskScoringDataService.getAllJurisdictionRisks();
    const scores: number[] = [];

    // Process each country's risk score
    for (const country of countries) {
      const score = allJurisdictionRisks.get(country) || 36; // Default risk if not found
      const normalizedScore = score / 100; // Convert to 0-1 range
      scores.push(normalizedScore);

      factors.push({
        id: `jurisdiction-${country.toLowerCase()}`,
        score: normalizedScore,
        severity: normalizedScore > 0.7 ? 'high' : normalizedScore > 0.4 ? 'medium' : 'low',
        description: `Jurisdiction risk for ${country}`,
        countries: [country],
        individualScores: [normalizedScore]
      });
    }

    // Calculate average score
    const avgScore = countries.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0.36; // Default risk score if no countries

    return {
      factors,
      aggregateScore: avgScore
    };
  }

  // TODO: Add a cache for the entity risk factors (Redis?)
  private async calculateEntityRisk(sot: SOTV2 | null): Promise<RiskFactorCollection<EntityRiskFactor>> {
    if (!sot) {
      return {
        factors: [],
        aggregateScore: 0
      };
    }

    const factors: EntityRiskFactor[] = [];
    let totalScore = 0;

    // Entity type risk
    const mainTypeScore = await riskScoringDataService.getEntityTypeRisk(sot.entity_type || '');

    factors.push({
      id: 'entity-type',
      score: mainTypeScore / 100,
      severity: mainTypeScore > 70 ? 'high' : mainTypeScore > 40 ? 'medium' : 'low',
      description: `Risk based on entity type ${sot.entity_type || 'unknown'}`,
      entityType: sot.entity_type || 'unknown',
      tags: [],
      modifiers: []
    });

    // Tag-based risks
    const tagScores = await Promise.all(
      (sot.entity_tags || [])
        .filter(tag => tag !== 'ofac sanctioned')
        .map(async tag => ({
          tag,
          score: await riskScoringDataService.getEntityTypeRisk(tag)
        }))
    );

    if (tagScores.length > 0) {
      const avgTagScore = tagScores.reduce((sum, tag) => sum + tag.score, 0) / tagScores.length;
      factors.push({
        id: 'entity-tags',
        score: avgTagScore / 100,
        severity: avgTagScore > 70 ? 'high' : avgTagScore > 40 ? 'medium' : 'low',
        description: `Risk based on ${tagScores.length} entity tags`,
        entityType: sot.entity_type || 'unknown',
        tags: sot.entity_tags || [],
        modifiers: []
      });
      totalScore += avgTagScore * 0.25; // 25% weight
      totalScore += mainTypeScore * 0.5; // 50% weight
    } else {
      totalScore += mainTypeScore * 0.75; // 75% weight
    }

    // Modifier-based risks
    const modifiers: Array<{ type: string; impact: number | 'Maximum' }> = [];

    // KYC modifier
    if (sot.no_kyc_req === true) {
      modifiers.push({ type: 'No KYC', impact: 10 });
      factors.push({
        id: 'kyc',
        score: 100 / 100,
        severity: 'high',
        description: `This entity has no KYC requirements`,
        entityType: sot.entity_type || 'unknown',
        tags: [],
        modifiers
      });
      totalScore = Math.min(totalScore + 25, 100);
    } else {
      factors.push({
        id: 'kyc',
        score: 0,
        severity: 'low',
        description: `This entity has KYC requirements`,
        entityType: sot.entity_type || 'unknown',
        tags: [],
        modifiers
      });
    }

    if (sot.entity_tags?.includes('ofac sanctioned') && sot.entity_type !== 'ofac sanctioned') {
      modifiers.push({ type: 'OFAC Sanctioned', impact: 10 });
      factors.push({
        id: 'ofac-sanctioned',
        score: 100 / 100,
        severity: 'high',
        description: `This entity is OFAC sanctioned`,
        entityType: sot.entity_type || 'unknown',
        tags: ['ofac sanctioned'],
        modifiers
      });
      totalScore = 100;
    }

    // For unknown entities, set a default risk score of 25
    if (totalScore === 0) {
      totalScore = 25;
    }

    return {
      factors,
      aggregateScore: totalScore / 100
    };
  }

  private async calculateTransactionRiskFactors(txs: BtcTransaction[], address: string, sot: SOTV2 | null): Promise<RiskFactorCollection<TransactionRiskFactor>> {
    const factors: TransactionRiskFactor[] = [];
    const entities = new Map<string, SOTV2>();
    const entityTypes = new Set<string>();

    let ofacSanctionedSender = false;
    let ofacSanctionedReceiver = false;
    let ofacSanctionedSenderAddress = '';
    let ofacSanctionedReceiverAddress = '';

    const inputAddresses = new Set<string>();
    const outputAddresses = new Set<string>();
    const addresses = new Set<string>();

    txs.forEach(tx => {
      tx.inputs.forEach(input => {
        inputAddresses.add(input.addr);
        addresses.add(input.addr);
      });
      tx.outputs.forEach(output => {
        outputAddresses.add(output.addr);
        addresses.add(output.addr);
      });
    });

    // remove self from the addresses
    addresses.delete(address);

    const addressArray = Array.from(addresses);

    // Early exit if no addresses to process
    if (addressArray.length === 0) {
      return {
        factors: [],
        aggregateScore: 0.15 // Default risk score for unknown entities
      };
    }

    // Batch fetch attributions for all addresses
    const { data } = await fetchAttributions(addressArray);

    if (!data || data.length === 0) {
      return {
        factors: [],
        aggregateScore: 0.15 // Default risk score for unknown entities
      };
    }

    // Create a map of address to entity attribution
    const attributionMap = new Map();
    data.forEach(item => {
      if (item && item.entity) {
        attributionMap.set(item.addr, item.entity);
      }
    });

    // Batch fetch SOTs for all entities
    const entityIds = Array.from(new Set(data.map(item => item.entity).filter(Boolean)));
    const sotPromises = entityIds.map(entityId => sotService.getSOT(entityId));
    const sotResults = await Promise.all(sotPromises);

    // Create a map of entity ID to SOT
    const sotMap = new Map();
    entityIds.forEach((entityId, index) => {
      if (sotResults[index]) {
        sotMap.set(entityId, sotResults[index]);
      }
    });

    // Process each address with the cached data
    const sotScores: { [key: string]: number } = {};

    for (const addr of addressArray) {
      const entityId = attributionMap.get(addr);
      if (!entityId) continue;

      const addrSot = sotMap.get(entityId);
      if (!addrSot || addrSot.entity_id === sot?.entity_id) continue;

      entities.set(addrSot.entity_id, addrSot);

      const entityRisk = await this.calculateEntityRisk(addrSot);
      sotScores[addrSot.entity_id] = entityRisk.aggregateScore;

      // average the entity risk scores
      entityTypes.add(addrSot.entity_type || 'unknown');
      if (addrSot.entity_tags?.includes('ofac sanctioned')) {
        if (inputAddresses.has(addr)) {
          ofacSanctionedSender = true;
          ofacSanctionedSenderAddress = addr;
        } else if (outputAddresses.has(addr)) {
          ofacSanctionedReceiver = true;
          ofacSanctionedReceiverAddress = addr;
        }
      }
    }

    // calculate the average entity risk score
    let averageSotScore = 0;
    if (Object.keys(sotScores).length > 0) {
      averageSotScore = Object.values(sotScores).reduce((sum, score) => sum + score, 0) / Object.keys(sotScores).length;
      averageSotScore = Math.round(averageSotScore * 100) / 100;
    } else {
      // Default risk score for unknown entity
      averageSotScore = 0.15;
    }

    if (ofacSanctionedSender) {
      factors.push({
        id: 'ofac-sanctioned-sender',
        score: 100 / 100,
        severity: 'high',
        description: `This entity has sent funds to an OFAC sanctioned entity: ${ofacSanctionedSenderAddress}`,
        type: 'sender',
        hops: []
      });
    }
    if (ofacSanctionedReceiver) {
      factors.push({
        id: 'ofac-sanctioned-receiver',
        score: 100 / 100,
        severity: 'high',
        description: `This entity has received funds from an OFAC sanctioned entity: ${ofacSanctionedReceiverAddress}`,
        type: 'receiver',
        hops: []
      });
    }
    if (entityTypes.size > 1) {
      factors.push({
        id: 'entity-type',
        score: averageSotScore,
        severity: 'high',
        description: `This entity has interacted with: ${Array.from(entityTypes).join(', ')}`,
        type: 'pattern',
        hops: [],
        details: Array.from(entities.values())
      });
    }

    return {
      factors,
      aggregateScore: ofacSanctionedSender || ofacSanctionedReceiver ? 1 : averageSotScore
    };
  }

  public async calculateRiskScore(address: string, type: 'address' | 'transaction'): Promise<RiskScoringResponse> {
    const sot = await this.getEntitySOT(address);

    const jurisdictionRisk = await this.calculateJurisdictionRisk(sot?.associated_countries || []);

    const entityRisk = await this.calculateEntityRisk(sot);

    const { txs } = await blockchainService.fetchAddressTransactions(address, { page: 1, limit: 10 });

    const transactionRisk = await this.calculateTransactionRiskFactors(txs, address, sot);

    // Calculate overall risk using weights
    let overallRisk = (
      entityRisk.aggregateScore * this.config.weights.entity +
      jurisdictionRisk.aggregateScore * this.config.weights.jurisdiction +
      transactionRisk.aggregateScore * this.config.weights.transaction
    );

    // If the entity is OFAC sanctioned, set the overall risk to 100
    if (entityRisk.factors.find(f => f.id === 'ofac-sanctioned')) {
      overallRisk = 1;
    }

    return {
      entityRisk,
      jurisdictionRisk,
      transactionRisk,
      overallRisk,
      analysisType: type,
      sot,
    };
  }

  private async getTransactionInfo(txHash: string, address: string): Promise<TransactionInfo> {
    // Fetch transaction data from blockchain service
    const { txs } = await blockchainService.fetchTransaction(txHash) as any;
    if (!txs) {
      throw new Error(`Transaction ${txHash} not found`);
    }

    console.log('Transaction data received:', JSON.stringify(txs, null, 2));
    // Get transaction risk factors
    const riskFactors = await this.calculateTransactionRiskFactors(txs, address, null);

    // Convert blockchain data to TransactionInfo format
    return {
      txHash: txs.txid,
      from: txs.inputs[0]?.addr || '',  // Using first input address as 'from'
      to: txs.outputs[0]?.addr || '',   // Using first output address as 'to'
      value: txs.outputs.reduce((sum: number, output: any) => sum + (output.value || 0), 0).toString(),
      timestamp: new Date(txs.timestamp * 1000).toISOString(),
      blockNumber: txs.block,
      gasUsed: txs.txfee,  // Using size as a proxy for gas used
      gasPrice: '0',         // BTC doesn't have gas price
      status: 'success',     // BTC transactions in the chain are always successful
      riskFactors: {
        amount: riskFactors.factors.find(f => f.type === 'amount') || { id: 'transaction-amount', score: 0, severity: 'low', description: 'No amount risk data' },
        sender: riskFactors.factors.find(f => f.type === 'sender') || { id: 'transaction-sender', score: 0, severity: 'low', description: 'No sender risk data' },
        receiver: riskFactors.factors.find(f => f.type === 'receiver') || { id: 'transaction-receiver', score: 0, severity: 'low', description: 'No receiver risk data' },
        pattern: riskFactors.factors.find(f => f.type === 'pattern') || { id: 'transaction-pattern', score: 0, severity: 'low', description: 'No pattern risk data' },
        timing: riskFactors.factors.find(f => f.type === 'timing') || { id: 'transaction-timing', score: 0, severity: 'low', description: 'No timing risk data' }
      }
    };
  }

  private async getEntitySOT(address: string): Promise<SOTV2 | null> {
    // First try to find entity by ENS address
    const { data } = await fetchAttributions([address]);

    if (!data || !data.length) {
      return null;
    }

    const attribution = data[0];
    const entityId = attribution.entity;
    const beneficialOwnerId = attribution.bo;

    if (!entityId) {
      return null;
    }

    // Get entity SOT data
    let entitySOT = await sotService.getSOT(entityId);
    if (!entitySOT) {
      // reference data uses canonical instead of entity_id
      entitySOT = await sotService.getSOTByUrl(entityId);
    }

    // Get beneficial owner SOT data if it exists and is different from entity
    let beneficialOwnerSOT: SOTV2 | null = null;
    if (beneficialOwnerId && beneficialOwnerId !== entityId) {
      beneficialOwnerSOT = await sotService.getSOT(beneficialOwnerId);
      if (!beneficialOwnerSOT) {
        beneficialOwnerSOT = await sotService.getSOTByUrl(beneficialOwnerId);
      }
    }

    // Apply beneficial owner override logic
    if (beneficialOwnerSOT && beneficialOwnerId !== entityId) {
      console.log('Applying beneficial owner override in risk scoring:', {
        address,
        originalEntity: entityId,
        beneficialOwner: beneficialOwnerId,
        originalEntityType: entitySOT?.entity_type,
        beneficialOwnerEntityType: beneficialOwnerSOT.entity_type,
        originalEntityTags: entitySOT?.entity_tags,
        beneficialOwnerEntityTags: beneficialOwnerSOT.entity_tags
      });

      // Return beneficial owner SOT data instead of entity SOT data
      return beneficialOwnerSOT;
    }

    return entitySOT;
  }
}
