import { Request, Response } from 'express';
import * as sotService from '../services/sot.service';
import { sotAnalysisService } from '../services/sotAnalysis.service';
import { CronJobsService } from '../services/cronJobs.service';

export const getLatestSOTs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the raw SOT documents and transform them to SOTV2 format
    const rawSOTs = await sotService.fetchAllSOT();
    
    // Transform to SOTV2 format with entity_tags array
    const transformedSOTs = rawSOTs.map(sot => ({
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
    }));
    
    res.json(transformedSOTs);
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