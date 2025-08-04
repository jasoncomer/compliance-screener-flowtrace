import { Request, Response } from 'express';
import { fetchEntityBalanceRows, getEntityBalanceById } from '../services/entityBalanceSheet.service';

export const getEntityBalances = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await fetchEntityBalanceRows();
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getEntityBalance = async (req: Request, res: Response): Promise<void> => {
  const { entityId } = req.params;
  const data = await getEntityBalanceById(entityId);
  if (!data) {
    res.status(404).json({ message: 'Entity not found' });
  } else {
    res.json(data);
  }
};