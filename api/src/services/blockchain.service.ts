import { modelFactory } from '@src/db/modelFactory';
import { getAddressTotalInOutBalancePipelineQuery } from './blockchain.utils';
import { PaginationParams, TransactionResponse } from '../types/blockchain.types';
import { BtcBlockDocument } from '../models/BtcBlock.model';

export const fetchAddressTransactionsTxid = async (
  address: string,
  txids: string[],
  { page, limit }: PaginationParams,
  direction?: 'incoming' | 'outgoing',
) => {
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');

  const query = {
    address,
    txid: { $nin: txids }
  };

  if (direction) {
    query[direction === 'incoming' ? 'outputs.addr' : 'inputs.addr'] = address;
  }

  return await BtcTransaction.find(
    query,
    {},
    {
      skip: (page - 1) * limit,
      limit,
      sort: { block: -1 }
    });
};

export const fetchAddressTransactions = async (
  address: string,
  { page, limit }: PaginationParams,
  direction?: 'incoming' | 'outgoing',
): Promise<TransactionResponse> => {
  const skip = (page - 1) * limit;
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');

  let query = {};
  if (direction == null) {
    query = {
      $or: [
        { 'inputs.addr': address },
        { 'outputs.addr': address }
      ]
    };
  } else {
    query = {
      [direction === 'incoming' ? 'outputs.addr' : 'inputs.addr']: address
    };
  }

  const [txData, totalTxs] = await Promise.all([
    BtcTransaction.find(
      query,
      {},
      {
        limit,
        skip,
        sort: { block: -1 }
      }
    ),
    BtcTransaction.countDocuments(query)
  ]);

  return {
    txs: txData,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalTxs / limit),
      totalTxs,
      limit
    }
  };
};

export const fetchAddressTransactionsWithCospend = async (
  address: string,
  { page, limit }: PaginationParams,
  direction?: 'incoming' | 'outgoing',
): Promise<TransactionResponse> => {
  const skip = (page - 1) * limit;
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');
  const BtcWallet = await modelFactory.getModel('BTCWallets');

  let query = {};
  if (direction == null) {
    query = {
      $or: [
        { 'inputs.addr': address },
        { 'outputs.addr': address }
      ]
    };
  } else {
    query = {
      [direction === 'incoming' ? 'outputs.addr' : 'inputs.addr']: address
    };
  }

  const [txData, totalTxs] = await Promise.all([
    BtcTransaction.find(
      query,
      {},
      {
        limit,
        skip,
        sort: { block: -1 }
      }
    ),
    BtcTransaction.countDocuments(query)
  ]);

  // Collect all unique input addresses to get their cospend_ids
  const inputAddresses = new Set<string>();
  txData.forEach(tx => {
    tx.inputs.forEach(input => {
      inputAddresses.add(input.addr);
    });
  });

  // Fetch cospend_ids for all input addresses
  const wallets = await BtcWallet.find({ addr: { $in: Array.from(inputAddresses) } });
  const cospendIdMap = new Map<string, string>();
  wallets.forEach(wallet => {
    cospendIdMap.set(wallet.addr, wallet.cospend_id);
  });

  // Enrich transaction data with cospend_ids
  const enrichedTxData = txData.map(tx => ({
    ...tx.toObject(),
    inputs: tx.inputs.map(input => ({
      ...input,
      cospend_id: cospendIdMap.get(input.addr) || input.addr
    }))
  }));

  return {
    txs: enrichedTxData,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalTxs / limit),
      totalTxs,
      limit
    }
  };
};

export const fetchTransactionsByCospendId = async (
  cospendId: string,
  { page, limit }: PaginationParams,
  direction?: 'incoming' | 'outgoing',
): Promise<TransactionResponse> => {
  const skip = (page - 1) * limit;
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');
  const BtcWallet = await modelFactory.getModel('BTCWallets');

  // First, get all addresses that belong to this cospend_id
  const wallets = await BtcWallet.find({ cospend_id: cospendId });
  const addresses = wallets.map(wallet => wallet.addr);

  if (addresses.length === 0) {
    return {
      txs: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalTxs: 0,
        limit
      }
    };
  }

  // Build query to find transactions involving any of these addresses
  let query = {};
  if (direction == null) {
    query = {
      $or: [
        { 'inputs.addr': { $in: addresses } },
        { 'outputs.addr': { $in: addresses } }
      ]
    };
  } else {
    query = {
      [direction === 'incoming' ? 'outputs.addr' : 'inputs.addr']: { $in: addresses }
    };
  }

  const [txData, totalTxs] = await Promise.all([
    BtcTransaction.find(
      query,
      {},
      {
        limit,
        skip,
        sort: { block: -1 }
      }
    ),
    BtcTransaction.countDocuments(query)
  ]);

  // Enrich transaction data with cospend_ids for all input addresses
  const allInputAddresses = new Set<string>();
  txData.forEach(tx => {
    tx.inputs.forEach(input => {
      allInputAddresses.add(input.addr);
    });
  });

  // Fetch cospend_ids for all input addresses
  const allWallets = await BtcWallet.find({ addr: { $in: Array.from(allInputAddresses) } });
  const cospendIdMap = new Map<string, string>();
  allWallets.forEach(wallet => {
    cospendIdMap.set(wallet.addr, wallet.cospend_id);
  });

  // Enrich transaction data with cospend_ids
  const enrichedTxData = txData.map(tx => ({
    ...tx.toObject(),
    inputs: tx.inputs.map(input => ({
      ...input,
      cospend_id: cospendIdMap.get(input.addr) || input.addr
    }))
  }));

  return {
    txs: enrichedTxData,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalTxs / limit),
      totalTxs,
      limit
    }
  };
};

export const fetchAddress = async (address: string) => {
  const BtcAddress = await modelFactory.getModel('BTCAddress');
  return await BtcAddress.findOne({ addr: address });
};

export const fetchAddressSummary = async (address: string) => {
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');
  
  // Get balance and transaction data
  const balanceData = await BtcTransaction.aggregate(getAddressTotalInOutBalancePipelineQuery(address));
  
  // Get transaction count
  const transactionCount = await BtcTransaction.countDocuments({
    $or: [
      { 'inputs.addr': address },
      { 'outputs.addr': address }
    ]
  });

  // Combine the data
  const result = balanceData[0] || { balance: '0 BTC', total_received: '0 BTC', total_spent: '0 BTC' };
  result.transactionCount = transactionCount;

  return result;
};

export const fetchBlock = async (block: string) => {
  const BtcBlockModel = await modelFactory.getModel('BTCBlock');
  const BtcTransactionModel = await modelFactory.getModel('BTCTransaction');

  // Try to parse as height (number), otherwise treat as hash (string)
  const blockHeight = parseInt(block, 10);
  const blockHash = !isNaN(blockHeight)
    ? await BtcBlockModel.findOne({ number: blockHeight })
    : await BtcBlockModel.findOne({ hash: block });

  if (!blockHash) {
    return null;
  }

  // Fetch transactions for this block
  const transactions = await BtcTransactionModel.find({ block: blockHash.height });

  return {
    ...blockHash.toObject(),
    transactions,
  };
};

export const fetchTransaction = async (txhash: string) => {
  const BtcTransactionModel = await modelFactory.getModel('BTCTransaction');
  return await BtcTransactionModel.findOne({ txid: txhash });
};

export const fetchWallets = async (options: {
  page: number,
  limit: number,
  addr?: string,
  cospendId?: string
}) => {
  const { page, limit, addr, cospendId } = options;
  const skip = (page - 1) * limit;

  const BtcWallet = await modelFactory.getModel('BTCWallets');

  const query: any = {};
  if (addr) query.addr = { $regex: addr, $options: 'i' }; // Case-insensitive search
  if (cospendId) query.cospend_id = cospendId;

  const [wallets, totalWallets] = await Promise.all([
    BtcWallet.find(
      query,
      {},
      {
        limit,
        skip,
        sort: { addr: 1 }
      }
    ),
    BtcWallet.countDocuments(query)
  ]);

  return {
    data: wallets,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalWallets / limit),
      totalItems: totalWallets,
      limit
    }
  };
};

export const fetchWalletByAddress = async (addr: string) => {
  const BtcWallet = await modelFactory.getModel('BTCWallets');
  return await BtcWallet.findOne({ addr });
};

export const fetchAddressBlockStats = async (address: string) => {
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');

  const pipeline = [
    {
      $match: {
        $or: [
          { 'inputs.addr': address },
          { 'outputs.addr': address }
        ]
      }
    },
    {
      $group: {
        _id: '$block',
        count: { $sum: 1 },
        totalValue: { $sum: '$value' },
        timestamp: { $first: '$time' }
      }
    },
    {
      $sort: { _id: -1 as const }
    }
  ];

  const blockStats = await BtcTransaction.aggregate(pipeline);

  if (blockStats.length === 0) {
    return {
      totalBlocks: 0,
      firstBlock: null,
      lastBlock: null
    };
  }

  const firstBlock = blockStats[blockStats.length - 1];
  const lastBlock = blockStats[0];

  return {
    totalBlocks: blockStats.length,
    firstBlock: {
      blockNumber: firstBlock._id,
      transactionCount: firstBlock.count,
      totalValue: firstBlock.totalValue,
      timestamp: firstBlock.timestamp
    },
    lastBlock: {
      blockNumber: lastBlock._id,
      transactionCount: lastBlock.count,
      totalValue: lastBlock.totalValue,
      timestamp: lastBlock.timestamp
    }
  };
};

export const fetchBlockTransactions = async (block: string, { page, limit }: PaginationParams) => {
  const skip = (page - 1) * limit;
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');

  // Try to parse as height (number), otherwise treat as hash (string)
  const blockHeight = parseInt(block, 10);
  let blockNumber: number | null = null;

  if (!isNaN(blockHeight)) {
    blockNumber = blockHeight;
  } else {
    const BtcBlockModel = await modelFactory.getModel('BTCBlock');
    const blockDoc = await BtcBlockModel.findOne({ hash: block });
    if (blockDoc) blockNumber = blockDoc.height;
  }

  if (blockNumber === null) {
    return {
      txs: [],
      pagination: {
        currentPage: page,
        totalPages: 0,
        totalTxs: 0,
        limit
      }
    };
  }

  const [txs, totalTxs] = await Promise.all([
    BtcTransaction.find(
      { block: blockNumber },
      {},
      { limit, skip, sort: { timestamp: -1 } }
    ),
    BtcTransaction.countDocuments({ block: blockNumber })
  ]);

  return {
    txs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalTxs / limit),
      totalTxs,
      limit
    }
  };
};

