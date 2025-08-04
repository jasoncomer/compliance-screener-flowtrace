import { GoogleSpreadsheetRow } from 'google-spreadsheet';
import { LeanDocument } from 'mongoose';
import { modelFactory } from '@src/db/modelFactory';
import { EntityTypeMasterlist, EntityTypeMasterlistDocument } from '@src/models';
import { GoogleSheetsService } from './googleSheets.service';
import { googleSheetsConfig } from '@src/configs/googleSheets.config';

// Types
type EntityTypeMasterlistCacheState = {
  cache: LeanDocument<EntityTypeMasterlistDocument>[];
  cacheMap: Map<string, EntityTypeMasterlist>;
  initialized: boolean;
};

// Cache state
const cacheState: EntityTypeMasterlistCacheState = {
  cache: [],
  cacheMap: new Map(),
  initialized: false,
};

// Initialize Google Sheets service for EntityTypeMasterlist
const entityTypeMasterlistSpreadsheetService = new GoogleSheetsService(googleSheetsConfig.entityTypeMasterlist.spreadsheetId);

// Helper functions
const updateCache = (documents: LeanDocument<EntityTypeMasterlistDocument>[]): void => {
  cacheState.cache = documents;
  cacheState.cacheMap.clear();

  documents.forEach((doc) => {
    cacheState.cacheMap.set(doc.entity_type, doc);
  });
};

// Initialize cache on module load
const initializeCache = async (): Promise<void> => {
  if (!cacheState.initialized) {
    try {
      const EntityTypeMasterlistModel = await modelFactory.getModel('EntityTypeMasterlist');
      const documents = await EntityTypeMasterlistModel.find().lean();

      updateCache(documents);
      cacheState.initialized = true;
      console.log('EntityTypeMasterlist cache initialized with', documents.length, 'records');
    } catch (error) {
      console.error('Failed to initialize EntityTypeMasterlist cache:', error);
      throw error;
    }
  }
};

// Public functions
export const fetchAllEntityTypeMasterlist = async (): Promise<LeanDocument<EntityTypeMasterlistDocument>[]> => {
  await initializeCache();
  return cacheState.cache;
};

export const getEntityTypeMasterlistByType = async (entityType: string): Promise<LeanDocument<EntityTypeMasterlistDocument> | null> => {
  await initializeCache();
  return cacheState.cacheMap.get(entityType) || null;
};

export const updateEntityTypeMasterlist = async (entityType: string, data: Partial<EntityTypeMasterlist>) => {
  if (!entityType) {
    throw new Error('entityType is required');
  }

  const EntityTypeMasterlistModel = await modelFactory.getModel('EntityTypeMasterlist');
  const updated = await EntityTypeMasterlistModel.findOneAndUpdate(
    { entity_type: entityType },
    data,
    { new: true, upsert: true }
  );

  if (updated) {
    const documents = [...cacheState.cache];
    const index = documents.findIndex((item) => item.entity_type === entityType);

    if (index !== -1) {
      documents[index] = updated.toObject();
    } else {
      documents.push(updated.toObject());
    }

    updateCache(documents);
  }

  return updated;
};

export const removeEntityTypeMasterlist = async (entityType: string) => {
  if (!entityType) {
    throw new Error('entityType is required');
  }

  const EntityTypeMasterlistModel = await modelFactory.getModel('EntityTypeMasterlist');
  const deleted = await EntityTypeMasterlistModel.findOneAndDelete({ entity_type: entityType });

  if (deleted) {
    updateCache(cacheState.cache.filter((item) => item.entity_type !== entityType));
  }

  return deleted;
};

// Transform Google Sheets row to EntityTypeMasterlist object
const transformSheetRowToEntityTypeMasterlist = (row: GoogleSpreadsheetRow): EntityTypeMasterlist | null => {
  const entity_type = row.get('entity_type')?.trim();
  if (!entity_type) {
    return null;
  }

  const getField = (field: string): string => row.get(field) || '';
  const getNumberField = (field: string): number => {
    const value = row.get(field);
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };
  const getBooleanField = (field: string): boolean => {
    const value = row.get(field);
    return value === 'TRUE' || value === 'true' || value === '1';
  };

  return {
    entity_type,
    display_name: getField('display_name'),
    entity_type_display: getField('Entity Type'),
    subcategory: getField('Subcategory'),
    category: getField('Category'),
    top_level_group: getField('Top-Level Group'),
    recovery_chance: getField('recovery_chance'),
    entity_type_default_logo: getField('entity_type_default_logo'),
    description: getField('description'),
    risk_score_type: getNumberField('risk_score_type'),
    risk: getBooleanField('risk'),
  };
};

// Sync log functions
const createSyncLog = async (success: boolean, message: string, count: number, error?: string) => {
  const EntityTypeMasterlistSyncLogModel = await modelFactory.getModel('EntityTypeMasterlistSyncLog');
  return EntityTypeMasterlistSyncLogModel.create({
    success,
    message,
    count,
    error,
  });
};

// Main sync function
export const updateMongoWithEntityTypeMasterlistSheet = async () => {
  const EntityTypeMasterlistModel = await modelFactory.getModel('EntityTypeMasterlist');

  try {
    const rows = await entityTypeMasterlistSpreadsheetService.getRows<EntityTypeMasterlist>('entity_type_master_list');
    console.log(`Found ${rows.length} rows in the EntityTypeMasterlist sheet`);

    const transformedData = rows.map(transformSheetRowToEntityTypeMasterlist)
      .filter((data): data is EntityTypeMasterlist => data !== null)
      .filter(validateEntityTypeMasterlist);

    console.log(`Adding ${transformedData.length} EntityTypeMasterlist documents to the database`);

    // Clear existing data and insert new data
    await EntityTypeMasterlistModel.deleteMany({});
    const result = await EntityTypeMasterlistModel.insertMany(transformedData);

    updateCache(result.map((doc) => doc.toObject()));
    console.log(`${result.length} EntityTypeMasterlist documents inserted`);

    await createSyncLog(true, 'EntityTypeMasterlist sheet updated successfully', result.length);

    return {
      success: true,
      message: 'EntityTypeMasterlist sheet updated',
      count: result.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await createSyncLog(false, 'EntityTypeMasterlist sheet update failed', 0, errorMessage);
    throw error;
  }
};

export const getLastSyncLogs = async (limit = 5) => {
  const EntityTypeMasterlistSyncLogModel = await modelFactory.getModel('EntityTypeMasterlistSyncLog');
  return EntityTypeMasterlistSyncLogModel.find().sort({ timestamp: -1 }).limit(limit).lean();
};

// Validation helper function
const validateEntityTypeMasterlist = (data: EntityTypeMasterlist): boolean => {
  // Basic validation - entity_type is required
  if (!data.entity_type || data.entity_type.trim() === '') {
    return false;
  }

  // Risk score should be between 0 and 100
  if (data.risk_score_type < 0 || data.risk_score_type > 100) {
    console.warn(`Invalid risk score ${data.risk_score_type} for entity type ${data.entity_type}`);
  }

  return true;
};

// Export for external use
export const getEntityTypeMasterlistCache = () => cacheState; 