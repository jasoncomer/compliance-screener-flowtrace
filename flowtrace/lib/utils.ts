import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateConsistent(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString()
  }
}

export function isValidAddress(address: string): boolean {
  // Basic validation for common address formats
  const bitcoinRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/
  const ethereumRegex = /^0x[a-fA-F0-9]{40}$/
  
  return bitcoinRegex.test(address) || ethereumRegex.test(address)
}

export function truncateAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2) return address
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

// Utility functions for connection debugging and state management
export const generateUniqueTxHash = (): string => {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

export const createConnectionHash = (connections: any[]): string => {
  return JSON.stringify(connections.map(conn => ({
    from: conn.from,
    to: conn.to,
    txHash: conn.txHash,
    amount: conn.amount,
    note: conn.note,
    currency: conn.currency,
    date: conn.date,
    direction: conn.direction,
    hideTxId: conn.hideTxId
  })).sort((a, b) => (a.txHash || '').localeCompare(b.txHash || '')))
}

export const validateConnection = (connection: any): boolean => {
  return !!(
    connection.from &&
    connection.to &&
    connection.from !== connection.to &&
    connection.txHash
  )
}

// Beneficial Owner Override Logic
export interface SOTEntity {
  entity_id: string;
  proper_name: string;
  entity_type: string;
  entity_tags?: string[];
  logo?: string;
  ofac?: boolean;
}

export interface AttributionData {
  entity: string; // entity_id
  bo: string; // beneficial owner entity_id
  custodian: string;
  script_type?: string;
  cospend_id?: string;
}

/**
 * Determines the appropriate suffix based on entity type
 * Returns "Deposit Address" for certain entity types, otherwise "Account" or "Wallet"
 */
const getEntityTypeSuffix = (entityType: string): string => {
  // Entity types that should show "Deposit Address"
  const depositAddressTypes = [
    'centralized exchange',
    'decentralized exchange',
    'money services business',
    'msb',
    'payment processor',
    'bank',
    'financial institution',
    'investment fund',
    'hedge fund',
    'asset management',
    'brokerage',
    'trading platform',
    'exchange',
    'otc desk',
    'atm operator',
    'remittance service',
    'money transfer',
    'payment gateway',
    'escrow service'
  ];
  
  if (depositAddressTypes.includes(entityType.toLowerCase())) {
    return 'Deposit Address';
  }
  
  // For other entity types, use "Account" or "Wallet" based on context
  if (entityType.toLowerCase().includes('wallet') || 
      entityType.toLowerCase().includes('personal') ||
      entityType.toLowerCase().includes('individual')) {
    return 'Wallet';
  }
  
  return 'Account';
}

/**
 * Determines the appropriate title based on entity type
 * Format: "Entity: BeneficialOwner Suffix"
 */
const getEntityTypeBasedTitle = (
  entityName: string,
  entityType: string,
  beneficialOwnerName: string
): string => {
  // Special case for custodian entities
  if (entityType === 'custodian') {
    return `${entityName}: ${beneficialOwnerName} Custodial Account`;
  }
  
  // Get the appropriate suffix based on the entity's type (not beneficial owner's type)
  const suffix = getEntityTypeSuffix(entityType);
  
  // Format: "Entity: BeneficialOwner Suffix"
  return `${entityName}: ${beneficialOwnerName} ${suffix}`;
}

/**
 * Applies beneficial owner override logic to address metadata
 * If beneficial_owner.entity_id != entity.entity_id, use beneficial owner's metadata
 * Otherwise, fall back to original entity values
 */
export const applyBeneficialOwnerOverride = (
  attributionData: AttributionData,
  entitySOTData: SOTEntity | undefined,
  beneficialOwnerSOTData: SOTEntity | undefined
): {
  entityName: string;
  entityType: string;
  entityTags: string[];
  logo: string | undefined;
  ofac: boolean;
  isBeneficialOwnerOverride: boolean;
  displayTitle: string;
} => {
  const { entity: entityId, bo: beneficialOwnerId } = attributionData;
  
  // Check if beneficial owner exists and has different entity_id
  if (beneficialOwnerId && beneficialOwnerId !== entityId && beneficialOwnerSOTData) {
    const entityName = entitySOTData?.proper_name || entityId;
    const entityType = entitySOTData?.entity_type || "wallet";
    const beneficialOwnerName = beneficialOwnerSOTData.proper_name;
    
    console.log('Applying beneficial owner override:', {
      originalEntity: entityId,
      beneficialOwner: beneficialOwnerId,
      originalName: entityName,
      beneficialOwnerName: beneficialOwnerName,
      originalType: entityType
    });
    
    // Create display title: "Entity: BeneficialOwner Suffix"
    const displayTitle = getEntityTypeBasedTitle(
      entityName,
      entityType,
      beneficialOwnerName
    );
    
    return {
      entityName: beneficialOwnerSOTData.proper_name,
      entityType: beneficialOwnerSOTData.entity_type,
      entityTags: beneficialOwnerSOTData.entity_tags || [],
      logo: beneficialOwnerSOTData.logo,
      ofac: beneficialOwnerSOTData.ofac || false,
      isBeneficialOwnerOverride: true,
      displayTitle
    };
  }
  
  // No override needed, return original entity
  const entityName = entitySOTData?.proper_name || entityId;
  const entityType = entitySOTData?.entity_type || "wallet";
  const suffix = getEntityTypeSuffix(entityType);
  const displayTitle = `${entityName} ${suffix}`; // Simple title when no beneficial owner override
  
  return {
    entityName,
    entityType,
    entityTags: entitySOTData?.entity_tags || [],
    logo: entitySOTData?.logo,
    ofac: entitySOTData?.ofac || false,
    isBeneficialOwnerOverride: false,
    displayTitle
  };
}

/**
 * Wraps text at a specified character limit, moving words to the next line
 * if they would exceed the limit
 */
export const wrapTextAtLimit = (text: string, limit: number = 35): string[] => {
  if (!text || text.length <= limit) {
    return [text];
  }

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // If adding this word would exceed the limit, start a new line
    if (currentLine.length + word.length + 1 > limit) {
      if (currentLine) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        // If currentLine is empty and word is longer than limit, split the word
        if (word.length > limit) {
          lines.push(word.substring(0, limit));
          currentLine = word.substring(limit);
        } else {
          currentLine = word;
        }
      }
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trim());
  }

  return lines;
}
