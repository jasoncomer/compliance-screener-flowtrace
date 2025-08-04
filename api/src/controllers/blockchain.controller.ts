import { Request, Response } from 'express';
import * as blockchainService from '../services/blockchain.service';

export const getAddressTransactionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await blockchainService.fetchAddressTransactions(address, { page, limit });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAddressController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const result = await blockchainService.fetchAddress(address);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAddressSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    if (!address) {
      res.status(400).json({ message: 'address is required' });
      return;
    }
    const result = await blockchainService.fetchAddressSummary(address);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBlock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { block } = req.params;
    const result = await blockchainService.fetchBlock(block);

    if (!result) {
      res.status(404).json({ message: 'Block not found' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { txhash } = req.params;
    if (!txhash) {
      res.status(400).json({ message: 'txhash is required' });
      return;
    }
    const result = await blockchainService.fetchTransaction(txhash);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWallets = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const addr = req.query.addr as string;
    const cospendId = req.query.cospend_id as string;

    const result = await blockchainService.fetchWallets({ page, limit, addr, cospendId });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getWalletByAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const { addr } = req.params;
    if (!addr) {
      res.status(400).json({ message: 'address is required' });
      return;
    }

    const result = await blockchainService.fetchWalletByAddress(addr);

    if (!result) {
      res.status(404).json({ message: 'Wallet not found' });
      return;
    }

    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAddressBlockStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    if (!address) {
      res.status(400).json({ message: 'address is required' });
      return;
    }

    const result = await blockchainService.fetchAddressBlockStats(address);
    res.json({ data: result });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getBlockTransactionsController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { block } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await blockchainService.fetchBlockTransactions(block, { page, limit });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAddressTransactionsWithCospendController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const result = await blockchainService.fetchAddressTransactionsWithCospend(address, { page, limit });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTransactionsByCospendIdController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { cospendId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const result = await blockchainService.fetchTransactionsByCospendId(cospendId, { page, limit });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
