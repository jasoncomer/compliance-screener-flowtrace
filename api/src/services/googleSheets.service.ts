import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { googleSheetsConfig } from '../configs/googleSheets.config';

interface SheetData {
  headers: string[];
  samples: Record<string, any>[];
}

interface SheetError {
  error: string;
  details: string;
}

// Load Google service account credentials
const googleServiceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../src/configs/blockscout-gcp.json'), 'utf8')
);

// Initialize auth client
const serviceAccountAuth = new JWT({
  email: googleServiceAccount.client_email,
  key: googleServiceAccount.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

export class GoogleSheetsService {
  private spreadsheet: GoogleSpreadsheet;

  constructor(spreadsheetId: string) {
    this.spreadsheet = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);
  }

  async loadSpreadsheet() {
    await this.spreadsheet.loadInfo();
  }

  async getSheetByTitle(title: string) {
    await this.loadSpreadsheet();
    const sheet = this.spreadsheet.sheetsByIndex.find(sheet => sheet.title.toLowerCase() === title.toLowerCase());
    if (!sheet) {
      throw new Error(`Sheet with title "${title}" not found`);
    }
    return sheet;
  }

  async getRows<T extends Record<string, any>>(sheetTitle: string) {
    const sheet = await this.getSheetByTitle(sheetTitle);
    return await sheet.getRows<T>();
  }

  async getAllSheetTitles(): Promise<string[]> {
    await this.loadSpreadsheet();
    return this.spreadsheet.sheetsByIndex.map(sheet => sheet.title);
  }

  async getSampleRowsFromAllSheets(sampleSize = 3): Promise<Record<string, SheetData | SheetError>> {
    await this.loadSpreadsheet();
    const result: Record<string, SheetData | SheetError> = {};

    for (const sheet of this.spreadsheet.sheetsByIndex) {
      try {
        const rows = await sheet.getRows();
        const sampleRows = rows.slice(0, sampleSize).map(row => {
          const rowData: Record<string, any> = {};
          sheet.headerValues.forEach(header => {
            rowData[header] = row.get(header);
          });
          return rowData;
        });
        result[sheet.title] = {
          headers: sheet.headerValues,
          samples: sampleRows
        };
      } catch (error) {
        console.error(`Error reading sheet ${sheet.title}:`, error);
        result[sheet.title] = {
          error: 'Failed to read sheet',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return result;
  }

  async analyzeSheetStructure(sheetTitle: string): Promise<{
    headers: string[];
    rowCount: number;
    sampleData: any[];
    dataTypes: Record<string, string>;
  }> {
    const sheet = await this.getSheetByTitle(sheetTitle);
    const rows = await sheet.getRows();
    const sampleSize = Math.min(5, rows.length);
    const sampleRows = rows.slice(0, sampleSize);

    // Analyze data types for each column
    const dataTypes: Record<string, string> = {};
    sheet.headerValues.forEach(header => {
      const values = sampleRows.map(row => row.get(header)).filter(Boolean);
      const type = this.inferDataType(values);
      dataTypes[header] = type;
    });

    return {
      headers: sheet.headerValues,
      rowCount: rows.length,
      sampleData: sampleRows.map(row => {
        const rowData: Record<string, any> = {};
        sheet.headerValues.forEach(header => {
          rowData[header] = row.get(header);
        });
        return rowData;
      }),
      dataTypes
    };
  }

  private inferDataType(values: any[]): string {
    if (values.length === 0) return 'unknown';

    const types = values.map(value => {
      if (value === null || value === undefined || value === '') return 'empty';
      if (!isNaN(value) && value.toString().trim() !== '') return 'number';
      if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') return 'boolean';
      if (value.includes(',')) return 'array';
      return 'string';
    });

    const uniqueTypes = Array.from(new Set(types.filter(t => t !== 'empty')));
    if (uniqueTypes.length === 0) return 'empty';
    if (uniqueTypes.length === 1) return uniqueTypes[0];
    return 'mixed';
  }
}

// Export singleton instance for SOT spreadsheet
export const sotSpreadsheetService = new GoogleSheetsService(googleSheetsConfig.sot.spreadsheetId);
export const entityBalanceSheetService = new GoogleSheetsService(googleSheetsConfig.entityBalanceSheet.spreadsheetId); 