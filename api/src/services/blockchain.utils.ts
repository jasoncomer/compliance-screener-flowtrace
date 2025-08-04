import { PipelineStage } from 'mongoose';
import { modelFactory } from '@src/db/modelFactory';

export const getAllTxsOfAddress = async (address: string) => {
  // TODO: Batch fetch requests where txs > 1000
  const BtcTransaction = await modelFactory.getModel('BTCTransaction');
  const txData = await BtcTransaction.find(
    { $or: [{ 'cpin.addr': address }, { 'cpout.addr': address }] },
    {},
    { limit: 1000 }
  );
  return txData;
};

export const getAddressData = async (address: string) => {
  const BtcAddress = await modelFactory.getModel('BTCAddress');
  const addressData = await BtcAddress.findOne({ addr: address });
  return addressData;
};

export const getAddressTotalInOutBalancePipelineQuery = (address: string) => {
  return [
    {
      $match: {
        $or: [
          { 'inputs.addr': address },
          { 'outputs.addr': address }
        ]
      }
    },
    {
      // For each document, isolate how much was received/spent for this address
      $project: {
        totalReceivedPerTx: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$outputs',
                  as: 'o',
                  cond: { $eq: ['$$o.addr', address] }
                }
              },
              in: '$$this.amt'
            }
          }
        },
        totalSpentPerTx: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$inputs',
                  as: 'i',
                  cond: { $eq: ['$$i.addr', address] }
                }
              },
              in: '$$this.amt'
            }
          }
        }
      }
    },
    {
      // Sum up across all matched transactions
      $group: {
        _id: null,
        total_received: { $sum: '$totalReceivedPerTx' },
        total_spent: { $sum: '$totalSpentPerTx' }
      }
    },
    {
      // Finally compute balance and format as BTC
      $project: {
        _id: 0,
        total_received: { 
          $cond: {
            if: { $eq: ['$total_received', null] },
            then: '0 BTC',
            else: {
              $concat: [
                { $toString: { $round: [{ $divide: ['$total_received', 100000000] }, 8] } },
                ' BTC'
              ]
            }
          }
        },
        total_spent: { 
          $cond: {
            if: { $eq: ['$total_spent', null] },
            then: '0 BTC',
            else: {
              $concat: [
                { $toString: { $round: [{ $divide: ['$total_spent', 100000000] }, 8] } },
                ' BTC'
              ]
            }
          }
        },
        balance: { 
          $cond: {
            if: { $or: [{ $eq: ['$total_received', null] }, { $eq: ['$total_spent', null] }] },
            then: '0 BTC',
            else: {
              $concat: [
                { $toString: { $round: [{ $divide: [{ $subtract: ['$total_received', '$total_spent'] }, 100000000] }, 8] } },
                ' BTC'
              ]
            }
          }
        }
      }
    }
  ] as PipelineStage[];
};