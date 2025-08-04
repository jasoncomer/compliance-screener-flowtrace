import { Request, Response } from 'express';
import * as entityTypeMasterlistService from '../services/entityTypeMasterlist.service';
import { CronJobsService } from '../services/cronJobs.service';

export const getEntityTypeMasterlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, subcategory, top_level_group, risk } = req.query;
    let result = await entityTypeMasterlistService.fetchAllEntityTypeMasterlist();

    // Apply filters if provided
    if (category) {
      result = result.filter(item => item.category?.toLowerCase() === (category as string).toLowerCase());
    }
    if (subcategory) {
      result = result.filter(item => item.subcategory?.toLowerCase() === (subcategory as string).toLowerCase());
    }
    if (top_level_group) {
      result = result.filter(item => item.top_level_group?.toLowerCase() === (top_level_group as string).toLowerCase());
    }
    if (risk !== undefined) {
      const riskFilter = risk === 'true' || risk === '1';
      result = result.filter(item => item.risk === riskFilter);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getEntityTypeMasterlistByType = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType } = req.params;
    const result = await entityTypeMasterlistService.getEntityTypeMasterlistByType(entityType);

    if (!result) {
      res.status(404).json({ message: 'Entity type not found' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEntityTypeMasterlistFromGSheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await entityTypeMasterlistService.updateMongoWithEntityTypeMasterlistSheet();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateEntityTypeMasterlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType } = req.params;
    const updateData = req.body;

    const result = await entityTypeMasterlistService.updateEntityTypeMasterlist(entityType, updateData);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteEntityTypeMasterlist = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType } = req.params;
    const result = await entityTypeMasterlistService.removeEntityTypeMasterlist(entityType);

    if (!result) {
      res.status(404).json({ message: 'Entity type not found' });
      return;
    }

    res.json({ message: 'Entity type deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const triggerManualEntityTypeMasterlistSync = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await CronJobsService.triggerEntityTypeMasterlistSync();
    if (result === null) {
      res.status(409).json({ message: 'EntityTypeMasterlist sync is already in progress on another instance' });
    } else {
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getLastSyncLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await entityTypeMasterlistService.getLastSyncLogs();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await entityTypeMasterlistService.fetchAllEntityTypeMasterlist();
    const categories = [...new Set(result.map(item => item.category).filter(Boolean))].sort();
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getSubcategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    let result = await entityTypeMasterlistService.fetchAllEntityTypeMasterlist();

    if (category) {
      result = result.filter(item => item.category?.toLowerCase() === (category as string).toLowerCase());
    }

    const subcategories = [...new Set(result.map(item => item.subcategory).filter(Boolean))].sort();
    res.json(subcategories);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTopLevelGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await entityTypeMasterlistService.fetchAllEntityTypeMasterlist();
    const topLevelGroups = [...new Set(result.map(item => item.top_level_group).filter(Boolean))].sort();
    res.json(topLevelGroups);
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