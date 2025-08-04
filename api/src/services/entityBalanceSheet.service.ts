import { entityBalanceSheetService } from './googleSheets.service';
import { GoogleSpreadsheetRow } from 'google-spreadsheet';

export interface EntityBalanceRow {
  [key: string]: any;
}

type EntityBalanceCacheState = {
  cache: EntityBalanceRow[];
  cacheMap: Map<string, EntityBalanceRow>;
  initialized: boolean;
};

const cacheState: EntityBalanceCacheState = {
  cache: [],
  cacheMap: new Map(),
  initialized: false,
};

const transformSheetRowToEntityBalance = (row: GoogleSpreadsheetRow): EntityBalanceRow | null => {
  const entity_id = row.get('entity_id')?.trim();
  if (!entity_id) return null;
  const obj: EntityBalanceRow = {};
  Object.keys(row.toObject()).forEach((header: string) => {
    obj[header] = row.get(header);
  });
  return obj;
};

const updateCache = (rows: EntityBalanceRow[]) => {
  cacheState.cache = rows;
  cacheState.cacheMap = new Map(rows.map(row => [row.entity_id, row]));
};

export const refreshEntityBalanceCache = async () => {
  const rows = await entityBalanceSheetService.getRows('BTC_by_entity_id');
  const parsedRows = rows.map(transformSheetRowToEntityBalance).filter((row): row is EntityBalanceRow => row !== null);
  updateCache(parsedRows);
  cacheState.initialized = true;
  return parsedRows;
};

export const fetchEntityBalanceRows = async (): Promise<EntityBalanceRow[]> => {
  if (!cacheState.initialized) {
    await refreshEntityBalanceCache();
  }
  return cacheState.cache;
};

export const getEntityBalanceById = async (entity_id: string): Promise<EntityBalanceRow | null> => {
  if (!cacheState.initialized) {
    await refreshEntityBalanceCache();
  }
  return cacheState.cacheMap.get(entity_id) || null;
}; 