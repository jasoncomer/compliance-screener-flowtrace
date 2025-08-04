import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import * as attributionService from '../services/attribution.service';
import { IAuthRequest } from '@src/interfaces';

export const getAttributions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { addresses } = req.body;
    if (!addresses || !Array.isArray(addresses)) {
      res.status(400).json({ message: 'addresses must be an array' });
      return;
    }

    const result = await attributionService.fetchAttributions(addresses);
    res.json(result);
  } catch (error: any) {
    if (error.message === 'wallets not found') {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: error.message });
    }
  }
};


export const getRelatedEntitiesController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { entity } = (req as any).params;
    if (!entity) {
      return next(createHttpError(400, 'Entity parameter is required'));
    }
    const result = await attributionService.getUniqueBosAndCsutodiansService(entity);
    res.json(result);
  } catch (error: any) {
    next(createHttpError(500, error.message));
  }
};
