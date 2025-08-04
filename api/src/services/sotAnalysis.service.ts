import { sotSpreadsheetService } from './googleSheets.service';

interface SheetAnalysis {
  title: string;
  purpose: string;
  headers: string[];
  rowCount: number;
  dataTypes: Record<string, string>;
  sampleData: any[];
  relationships?: string[];
}

export class SOTAnalysisService {
  private sheetAnalysis: Map<string, SheetAnalysis> = new Map();

  async analyzeAllSheets(): Promise<Map<string, SheetAnalysis>> {
    const titles = await sotSpreadsheetService.getAllSheetTitles();

    for (const title of titles) {
      try {
        const analysis = await sotSpreadsheetService.analyzeSheetStructure(title);
        const purpose = this.inferSheetPurpose(title, analysis.headers);
        const relationships = this.findRelationships(title, analysis.headers);

        this.sheetAnalysis.set(title, {
          title,
          purpose,
          headers: analysis.headers,
          rowCount: analysis.rowCount,
          dataTypes: analysis.dataTypes,
          sampleData: analysis.sampleData,
          relationships
        });
      } catch (error) {
        console.error(`Error analyzing sheet ${title}:`, error);
      }
    }

    return this.sheetAnalysis;
  }

  private inferSheetPurpose(title: string, headers: string[]): string {
    const titleLower = title.toLowerCase();
    const headerSet = new Set(headers.map(h => h.toLowerCase()));

    // Common sheet purposes based on title and headers
    if (titleLower === 'sot') {
      return 'Main entity information database containing core entity details';
    }
    if (titleLower === 'dropdown_options') {
      return 'Configuration data for risk scores, entity types, and jurisdictions';
    }
    if (titleLower.includes('risk')) {
      return 'Risk scoring related data and configurations';
    }
    if (headerSet.has('entity_id') && headerSet.has('address')) {
      return 'Entity-address mapping and relationships';
    }
    if (headerSet.has('timestamp') || headerSet.has('date')) {
      return 'Time-series or historical data';
    }
    if (headerSet.has('country') || headerSet.has('jurisdiction')) {
      return 'Geographical or jurisdictional data';
    }

    return 'Purpose needs manual review';
  }

  private findRelationships(title: string, headers: string[]): string[] {
    const relationships: string[] = [];
    const headerSet = new Set(headers.map(h => h.toLowerCase()));

    // Look for common relationship patterns
    if (headerSet.has('entity_id')) {
      relationships.push('Links to main SOT table via entity_id');
    }
    if (headerSet.has('parent_id')) {
      relationships.push('Hierarchical relationship with parent entities');
    }
    if (headerSet.has('address') || headerSet.has('ens_address')) {
      relationships.push('Links to blockchain addresses');
    }
    if (headerSet.has('country') || headerSet.has('jurisdiction')) {
      relationships.push('Links to jurisdictional data');
    }

    return relationships;
  }

  async getSheetSummary(): Promise<string> {
    if (this.sheetAnalysis.size === 0) {
      await this.analyzeAllSheets();
    }

    let summary = 'SOT Spreadsheet Analysis:\n\n';

    for (const [title, analysis] of this.sheetAnalysis) {
      summary += `Sheet: ${title}\n`;
      summary += `Purpose: ${analysis.purpose}\n`;
      summary += `Row Count: ${analysis.rowCount}\n`;
      summary += `Headers: ${analysis.headers.join(', ')}\n`;
      if (analysis.relationships?.length) {
        summary += `Relationships: ${analysis.relationships.join('; ')}\n`;
      }
      summary += '\nSample Data Types:\n';
      Object.entries(analysis.dataTypes).forEach(([header, type]) => {
        summary += `  ${header}: ${type}\n`;
      });
      summary += '\n---\n\n';
    }

    return summary;
  }

  getSheetAnalysis(title: string): SheetAnalysis | undefined {
    return this.sheetAnalysis.get(title);
  }

  async refreshAnalysis(): Promise<void> {
    this.sheetAnalysis.clear();
    await this.analyzeAllSheets();
  }
}

// Export singleton instance
export const sotAnalysisService = new SOTAnalysisService(); 