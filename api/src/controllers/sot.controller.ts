import { Request, Response } from 'express';
import * as sotService from '../services/sot.service';
import { sotAnalysisService } from '../services/sotAnalysis.service';
import { CronJobsService } from '../services/cronJobs.service';

export const getLatestSOTs = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await sotService.fetchAllSOT();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateSOTFromGSheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await sotService.updateMongoWithSOTSheet();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLastSyncLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await sotService.getLastSyncLogs();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const analyzeSheetStructure = async (req: Request, res: Response): Promise<void> => {
  try {
    const format = req.query.format as string;
    if (format === 'text') {
      const summary = await sotAnalysisService.getSheetSummary();
      res.type('text/plain').send(summary);
    } else {
      const analysis = await sotAnalysisService.analyzeAllSheets();
      res.json(Object.fromEntries(analysis));
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCronStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const status = CronJobsService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const triggerManualSOTSync = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await CronJobsService.triggerSOTSync();
    if (result === null) {
      res.status(409).json({ message: 'SOT sync is already in progress on another instance' });
    } else {
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}; 