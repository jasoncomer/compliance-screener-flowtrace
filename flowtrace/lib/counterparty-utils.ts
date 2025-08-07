import { fetchSOTData, fetchAttributionData } from './api'
import { applyBeneficialOwnerOverride, type SOTEntity, type AttributionData } from './utils'

interface SOTEntry {
  entity_id: string
  proper_name?: string
  entity_type?: string
  entity_tags?: string[]
  url?: string
  ens_address?: string
  logo?: string
  ofac?: boolean
}

interface AttributionEntry {
  addr: string
  entity?: string
  bo?: string
  cospend_id?: string
}

let sotDataCache: SOTEntry[] | null = null
let sotDataPromise: Promise<SOTEntry[]> | null = null

// Cache SOT data to avoid repeated API calls
export const getSOTData = async (): Promise<SOTEntry[]> => {
  if (sotDataCache) {
    return sotDataCache
  }
  
  if (sotDataPromise) {
    return sotDataPromise
  }
  
  sotDataPromise = fetchSOTData().then(data => {
    sotDataCache = data
    return data
  }).catch(error => {
    console.error('Failed to fetch SOT data:', error)
    return []
  })
  
  return sotDataPromise
}

// Function to get proper counterparty name with beneficial owner override
export const getCounterpartyName = async (address: string): Promise<string> => {
  try {
    // Clean the address - remove any prefixes like "searched_" or "_child_"
    const cleanAddress = address
      .replace(/^searched_/, '')
      .replace(/_child_\d+$/, '')
    
    console.log('🔍 Looking up counterparty name for:', {
      originalAddress: address,
      cleanAddress: cleanAddress
    })
    
    // Step 1: Get attribution data to find the entity ID and beneficial owner
    const attributionData = await fetchAttributionData([cleanAddress])
    console.log('📊 Attribution data:', attributionData)
    
    if (!attributionData?.data || !Array.isArray(attributionData.data) || attributionData.data.length === 0) {
      console.log('❌ No attribution data found for address:', cleanAddress)
      const firstSix = cleanAddress.substring(0, 6)
      return `Unknown_${firstSix}`
    }
    
    const attribution = attributionData.data[0] as AttributionEntry
    const entityId = attribution.entity
    const beneficialOwnerId = attribution.bo
    
    if (!entityId) {
      console.log('❌ No entity ID found in attribution data for address:', cleanAddress)
      const firstSix = cleanAddress.substring(0, 6)
      return `Unknown_${firstSix}`
    }
    
    console.log('✅ Found entity ID:', entityId, 'and beneficial owner:', beneficialOwnerId, 'for address:', cleanAddress)
    
    // Step 2: Get SOT data for both entity and beneficial owner
    const sotData = await getSOTData()
    
    console.log('📊 SOT data loaded:', {
      totalEntries: sotData.length,
      sampleEntries: sotData.slice(0, 3).map(entry => ({
        entity_id: entry.entity_id,
        proper_name: entry.proper_name,
        entity_type: entry.entity_type
      }))
    })
    
    // Find entity SOT data
    const entitySOTData = sotData.find(entry => 
      entry.entity_id?.toLowerCase() === entityId.toLowerCase()
    )
    
    // Find beneficial owner SOT data if it exists
    const beneficialOwnerSOTData = beneficialOwnerId ? sotData.find(entry => 
      entry.entity_id?.toLowerCase() === beneficialOwnerId.toLowerCase()
    ) : undefined
    
    // Apply beneficial owner override logic
    const attributionDataForOverride: AttributionData = {
      entity: entityId,
      bo: beneficialOwnerId || '',
      custodian: '',
      cospend_id: attribution.cospend_id
    }
    
    const overrideResult = applyBeneficialOwnerOverride(
      attributionDataForOverride,
      entitySOTData as SOTEntity | undefined,
      beneficialOwnerSOTData as SOTEntity | undefined
    )
    
    if (overrideResult.isBeneficialOwnerOverride) {
      console.log('✅ Applied beneficial owner override:', {
        address: cleanAddress,
        originalEntity: entityId,
        beneficialOwner: beneficialOwnerId,
        finalName: overrideResult.entityName,
        finalType: overrideResult.entityType
      })
      return overrideResult.entityName
    }
    
    // Fallback to original logic if no beneficial owner override
    if (entitySOTData?.proper_name) {
      console.log('✅ Found SOT match:', {
        address: cleanAddress,
        entity_id: entityId,
        proper_name: entitySOTData.proper_name,
        entity_type: entitySOTData.entity_type
      })
      return entitySOTData.proper_name
    }
    
    console.log('❌ No SOT match found for entity ID:', entityId)
    
    // Fallback: Use entity ID as name if no proper name found
    return entityId.charAt(0).toUpperCase() + entityId.slice(1)
    
  } catch (error) {
    console.error('Error getting counterparty name:', error)
    // Fallback: Unknown_{first 6 characters}
    const cleanAddress = address.replace(/^searched_/, '').replace(/_child_\d+$/, '')
    const firstSix = cleanAddress.substring(0, 6)
    return `Unknown_${firstSix}`
  }
}

// Function to get counterparty name synchronously (for cases where we already have SOT data)
export const getCounterpartyNameSync = (address: string, sotData: SOTEntry[]): string => {
  try {
    // Clean the address
    const cleanAddress = address
      .replace(/^searched_/, '')
      .replace(/_child_\d+$/, '')
    
    // Note: This sync version can't do attribution lookup, so it falls back to direct matching
    // This is mainly for cases where we already have the entity ID
    
    // Look for exact entity_id match first
    const entityIdMatch = sotData.find(entry => 
      entry.entity_id?.toLowerCase() === cleanAddress.toLowerCase()
    )
    
    if (entityIdMatch?.proper_name) {
      return entityIdMatch.proper_name
    }
    
    // Look for URL match (URL might contain the address)
    const urlMatch = sotData.find(entry => 
      entry.url?.toLowerCase().includes(cleanAddress.toLowerCase())
    )
    
    if (urlMatch?.proper_name) {
      return urlMatch.proper_name
    }
    
    // Look for ENS address match
    const ensMatch = sotData.find(entry => 
      entry.ens_address?.toLowerCase() === cleanAddress.toLowerCase()
    )
    
    if (ensMatch?.proper_name) {
      return ensMatch.proper_name
    }
    
    // Fallback: Unknown_{first 6 characters}
    const firstSix = cleanAddress.substring(0, 6)
    return `Unknown_${firstSix}`
    
  } catch (error) {
    console.error('Error getting counterparty name sync:', error)
    const cleanAddress = address.replace(/^searched_/, '').replace(/_child_\d+$/, '')
    const firstSix = cleanAddress.substring(0, 6)
    return `Unknown_${firstSix}`
  }
}

// New function to get entity information with beneficial owner override
export const getEntityInfoWithOverride = async (address: string): Promise<{
  entityName: string;
  entityType: string;
  entityTags: string[];
  logo?: string;
  ofac: boolean;
  isBeneficialOwnerOverride: boolean;
  displayTitle: string;
}> => {
  try {
    const cleanAddress = address
      .replace(/^searched_/, '')
      .replace(/_child_\d+$/, '')
    
    // Get attribution data
    const attributionData = await fetchAttributionData([cleanAddress])
    
    if (!attributionData?.data || !Array.isArray(attributionData.data) || attributionData.data.length === 0) {
      return {
        entityName: `Unknown_${cleanAddress.slice(0, 6)}`,
        entityType: 'wallet',
        entityTags: [],
        ofac: false,
        isBeneficialOwnerOverride: false,
        displayTitle: `Unknown_${cleanAddress.slice(0, 6)} Wallet`
      }
    }
    
    const attribution = attributionData.data[0] as AttributionEntry
    const entityId = attribution.entity
    const beneficialOwnerId = attribution.bo
    
    if (!entityId) {
      return {
        entityName: `Unknown_${cleanAddress.slice(0, 6)}`,
        entityType: 'wallet',
        entityTags: [],
        ofac: false,
        isBeneficialOwnerOverride: false,
        displayTitle: `Unknown_${cleanAddress.slice(0, 6)} Wallet`
      }
    }
    
    // Get SOT data
    const sotData = await getSOTData()
    
    // Find entity and beneficial owner SOT data
    const entitySOTData = sotData.find(entry => 
      entry.entity_id?.toLowerCase() === entityId.toLowerCase()
    )
    
    const beneficialOwnerSOTData = beneficialOwnerId ? sotData.find(entry => 
      entry.entity_id?.toLowerCase() === beneficialOwnerId.toLowerCase()
    ) : undefined
    
    // Apply beneficial owner override
    const attributionDataForOverride: AttributionData = {
      entity: entityId,
      bo: beneficialOwnerId || '',
      custodian: '',
      cospend_id: attribution.cospend_id
    }
    
    return applyBeneficialOwnerOverride(
      attributionDataForOverride,
      entitySOTData as SOTEntity | undefined,
      beneficialOwnerSOTData as SOTEntity | undefined
    )
    
  } catch (error) {
    console.error('Error getting entity info with override:', error)
    const cleanAddress = address.replace(/^searched_/, '').replace(/_child_\d+$/, '')
    return {
      entityName: `Unknown_${cleanAddress.slice(0, 6)}`,
      entityType: 'wallet',
      entityTags: [],
      ofac: false,
      isBeneficialOwnerOverride: false,
      displayTitle: `Unknown_${cleanAddress.slice(0, 6)} Wallet`
    }
  }
} 