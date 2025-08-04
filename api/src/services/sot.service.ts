import { GoogleSpreadsheetRow } from 'google-spreadsheet';
import { LeanDocument } from 'mongoose';
import { modelFactory } from '@src/db/modelFactory';
import { SOT, SOTDocument, SOTV2 } from '@src/models';
import { sotSpreadsheetService } from './googleSheets.service';

// Types
type CacheState = {
  sotCache: LeanDocument<SOTDocument>[];
  sotCacheMap: Map<string, SOTV2>;
  sotCacheUrlMap: Map<string, SOTV2>;
  initialized: boolean;
};

// Cache state
const cacheState: CacheState = {
  sotCache: [],
  sotCacheMap: new Map(),
  sotCacheUrlMap: new Map(),
  initialized: false,
};

// Helper functions
const transformToSOTV2 = (sot: LeanDocument<SOTDocument>): SOTV2 => ({
  ...sot,
  entity_tags: [
    sot.entity_tag1,
    sot.entity_tag2,
    sot.entity_tag3,
    sot.entity_tag4,
    sot.entity_tag5,
    sot.entity_tag6,
    sot.entity_tag7,
  ].filter(Boolean),
  associated_countries: [
    sot.associate_country_1,
    sot.associate_country_2,
    sot.associate_country_3,
    sot.associate_country_4,
    sot.associate_country_5,
    sot.associate_country_6,
  ].filter(Boolean),
  social_media_profiles: [
    sot.social_media_profile,
    sot.social_media_profile_2,
    sot.social_media_profile_3,
    sot.social_media_profile_4,
  ].filter(Boolean),
});

const updateCache = (documents: LeanDocument<SOTDocument>[]) => {
  cacheState.sotCache = documents;
  const transformedDocs = documents.map((sot) => transformToSOTV2(sot));
  cacheState.sotCacheMap = new Map(transformedDocs.map((sot) => [sot.entity_id, sot]));
  cacheState.sotCacheUrlMap = new Map(transformedDocs.map((sot) => [sot.url, sot]));
};

const getBooleanFromString = (value: string | undefined): boolean => String(value || '').toLowerCase() === 'true';

export const getBooleanFromDropdown = (value: string): boolean | null => {
  if (value === '' || value == null) {
    return null;
  }

  if (value.toLowerCase() === 'true') {
    return true;
  }
  if (value.toLowerCase() === 'false') {
    return false;
  }

  return null;
};

const transformSheetRowToSOT = (row: GoogleSpreadsheetRow): SOT | null => {
  const entity_id = row.get('entity_id')?.trim();
  if (!entity_id) {
    return null;
  }

  const getField = (field: string): string => row.get(field) || '';

  return {
    entity_id,
    parent_id: getField('parent_id'),
    date_updated: getField('date_updated'),
    user: getField('user'),
    revisit_site: getBooleanFromString(row.get('revisit_site')),
    no_kyc_req: getBooleanFromString(row.get('no_kyc_req')),
    url: getField('url'),
    proper_name: getField('proper_name'),
    entity_type: getField('entity_type'),
    dead: getBooleanFromString(row.get('dead')),
    legal_info_url: getField('legal_info_url'),
    contact_email: getField('contact_email'),
    contact_telegram: getField('contact_telegram'),
    contact_twitter: getField('contact_twitter'),
    contact_phone: getField('contact_phone'),
    contact_address: getField('contact_address'),
    logo: getField('logo'),
    centralized: getBooleanFromDropdown(row.get('centralized')),
    year_founded: getField('year_founded'),
    social_media_profile: getField('social_media_profile'),
    social_media_profile_2: getField('social_media_profile_2'),
    social_media_profile_3: getField('social_media_profile_3'),
    social_media_profile_4: getField('social_media_profile_4'),
    description_merged: getField('description_merged'),
    associate_country_1: getField('associate_country_1'),
    ticker: getField('ticker'),
    note: getField('note'),
    entity_tag1: getField('entity_tag1'),
    entity_tag2: getField('entity_tag2'),
    entity_tag3: getField('entity_tag3'),
    entity_tag4: getField('entity_tag4'),
    entity_tag5: getField('entity_tag5'),
    entity_tag6: getField('entity_tag6'),
    entity_tag7: getField('entity_tag7'),
    associate_country_2: getField('associate_country_2'),
    associate_country_3: getField('associate_country_3'),
    associate_country_4: getField('associate_country_4'),
    associate_country_5: getField('associate_country_5'),
    associate_country_6: getField('associate_country_6'),
    ens_address: getField('ens_address'),
    key_personnel: getField('key_personnel'),
    ceo: getField('ceo'),
    ofac: !!getBooleanFromDropdown(row.get('ofac')),
  };
};

// Initialize cache on module load
const initializeCache = async (): Promise<void> => {
  if (!cacheState.initialized) {
    try {
      const SOTModel = await modelFactory.getModel('SOT');
      const documents = await SOTModel.find().lean();

      // Filter out placeholder records
      const filteredDocs = documents.filter((sot) => !sot.url.startsWith('_'));
      updateCache(filteredDocs);

      cacheState.initialized = true;
      console.log('SOT cache initialized with', filteredDocs.length, 'records');
    } catch (error) {
      console.error('Failed to initialize SOT cache:', error);
      throw error;
    }
  }
};

// Initialize cache when module is loaded
initializeCache().catch(console.error);

export const fetchAllSOT = async (): Promise<LeanDocument<SOTDocument>[]> => {
  if (!cacheState.initialized) {
    await initializeCache();
  }
  return cacheState.sotCache;
};

export const getSOT = async (id: string): Promise<SOTV2 | null> => {
  if (!id) {
    throw new Error('id is required');
  }
  if (!cacheState.initialized) {
    await initializeCache();
  }
  return cacheState.sotCacheMap.get(id) || null;
};

export const updateSOT = async (id: string, data: Partial<SOT>) => {
  if (!id) {
    throw new Error('id is required');
  }
  const SOTModel = await modelFactory.getModel('SOT');
  const updated = await SOTModel.findByIdAndUpdate(id, data, { new: true });

  if (updated) {
    const documents = [...cacheState.sotCache];
    const index = documents.findIndex((sot) => sot._id.toString() === id);
    if (index !== -1) {
      documents[index] = updated.toObject();
      updateCache(documents);
    }
  }

  return updated;
};

export const removeSOT = async (id: string) => {
  if (!id) {
    throw new Error('id is required');
  }
  const SOTModel = await modelFactory.getModel('SOT');
  const deleted = await SOTModel.findByIdAndDelete(id);

  if (deleted) {
    updateCache(cacheState.sotCache.filter((sot) => sot._id.toString() !== id));
  }

  return deleted;
};

const createSyncLog = async (success: boolean, message: string, count: number, error?: string) => {
  const SOTSyncLogModel = await modelFactory.getModel('SOTSyncLog');
  return SOTSyncLogModel.create({
    success,
    message,
    count,
    error,
  });
};

export const updateMongoWithSOTSheet = async () => {
  const SOTModel = await modelFactory.getModel('SOT');

  try {
    const rows = await sotSpreadsheetService.getRows<SOT>('sot');
    console.log(`Found ${rows.length} rows in the sheet`);

    const transformedData = rows.map(transformSheetRowToSOT).filter((data): data is SOT => data !== null);

    console.log(`Adding ${transformedData.length} documents to the database`);

    await SOTModel.deleteMany({});
    const result = await SOTModel.insertMany(transformedData);

    updateCache(result.map((doc) => doc.toObject()));
    console.log(`${result.length} documents inserted`);

    await createSyncLog(true, 'SOT sheet updated successfully', result.length);

    return {
      success: true,
      message: 'SOT sheet updated',
      count: result.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await createSyncLog(false, 'SOT sheet update failed', 0, errorMessage);
    throw error;
  }
};

export const getLastSyncLogs = async (limit = 5) => {
  const SOTSyncLogModel = await modelFactory.getModel('SOTSyncLog');
  return SOTSyncLogModel.find().sort({ timestamp: -1 }).limit(limit).lean();
};

// helper function to find an sot by url
export const getSOTByUrl = async (url: string): Promise<SOTV2 | null> => {
  if (!url) {
    throw new Error('url is required');
  }
  if (!cacheState.initialized) {
    await initializeCache();
  }
  return cacheState.sotCacheUrlMap.get(url) || null;
};
