import { Request, Response } from 'express';
import * as socialMediaService from '../services/socialMedia.service';

export const getNewsDataController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;

    if (!address) {
      res.status(400).json({ message: 'Address is required' });
      return;
    }

    const result = await socialMediaService.getNewsData(address);
    res.json(result);
  } catch (error: any) {
    console.error('Error in getNewsDataController:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
};

export const getMentionsDataController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { searchTerm } = req.params;
    const { context } = req.query;

    if (!searchTerm) {
      res.status(400).json({ message: 'Search term is required' });
      return;
    }

    if (!context || !['address', 'beneficial_owner', 'entity'].includes(context as string)) {
      res.status(400).json({ message: 'Valid context is required (address, beneficial_owner, or entity)' });
      return;
    }

    const result = await socialMediaService.getMentionsData(
      searchTerm,
      context as 'address' | 'beneficial_owner' | 'entity'
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error in getMentionsDataController:', error);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
}; 