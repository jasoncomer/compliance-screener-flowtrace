import { sotAnalysisService } from '../services/sotAnalysis.service';

async function main() {
    try {
        const summary = await sotAnalysisService.getSheetSummary();
        console.log(summary);
    } catch (error) {
        console.error('Error analyzing sheets:', error);
    }
}

main().catch(console.error); 