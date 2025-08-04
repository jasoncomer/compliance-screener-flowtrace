import { Request, Response } from 'express';
import * as cryptoService from '../services/crypto.service';

/**
 * Get prices for multiple cryptocurrencies
 * @param req Express request object
 * @param res Express response object
 */
export const getCryptoPrices = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await cryptoService.fetchBitcoinPrice();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
