import { NextFunction, Response } from 'express';
import createHttpError from 'http-errors';
import { modelFactory } from '@src/db/modelFactory';
import { BtcAttribution, IBtcAddress, IReferenceAttribution } from '@src/models';
import { IBtcWallet, IBtcWalletDocument } from '@src/models/BtcWallets.model';
import { IAuthRequest } from '@src/interfaces';
import { customResponse } from '@src/utils';

export const getCospendIdMap = async (addresses: string[]): Promise<Map<string, string>> => {
  const btcWallets = await modelFactory.getModel('BTCWallets');
  const cospendIds = await btcWallets.find({ addr: { $in: addresses } });
  const map = new Map<string, string>();
  for (const wallet of cospendIds) {
    map.set(wallet.addr, wallet.cospend_id);
  }
  return map;
};

export const fetchAttributions = async (addresses: string[]): Promise<{ data: BtcAttribution[], referenceData: IReferenceAttribution[] }> => {
  // Fetch reference data
  const ReferenceAttribution = await modelFactory.getModel('ReferenceAttribution');
  const referenceData = await ReferenceAttribution.find({ address: { $in: addresses } }).lean();

  // Fetch entity data
  const BtcAttribution = await modelFactory.getModel('BtcAttribution');
  const attributionData = await BtcAttribution.find({ addr: { $in: addresses } }).lean();
  const attributionMap = new Map<string, BtcAttribution>();
  for (const attribution of attributionData) {
    attributionMap.set(attribution.addr, attribution);
  }

  // Get Cospend ID for each address
  const BtcWallets = await modelFactory.getModel('BTCWallets');
  const walletsData = await BtcWallets.find({ addr: { $in: addresses } }).lean() as IBtcWalletDocument[];
  const walletsMap = new Map<string, IBtcWallet>();
  for (const wallet of walletsData) {
    walletsMap.set(wallet.addr, wallet);
  }

  // Get script type for each address
  const BtcAddress = await modelFactory.getModel('BTCAddress');
  const addressesData = await BtcAddress.find({ addr: { $in: addresses } }).lean();
  const addressMap = new Map<string, IBtcAddress>();
  for (const address of addressesData) {
    addressMap.set(address.addr, address);
  }

  // Assemble
  const data = addresses.map((address) => {
    const addressData = addressMap.get(address);
    const attribution = attributionMap.get(address);
    const script_type = addressData?.script_type;
    const cospend_id = walletsMap.get(address)?.cospend_id;

    return {
      addr: address,
      ...attribution,
      cospend_id,
      script_type,
    };
  }) as BtcAttribution[];

  return { data, referenceData };
};

/**
 * Retuns a hashmap of addresses to their attribution
 * @param addresses 
 * @returns 
 */
export const fetchAttributionsMap = async (addresses: string[]): Promise<Map<string, BtcAttribution>> => {
  const { data } = await fetchAttributions(addresses);
  const map = new Map<string, BtcAttribution>();
  for (const attribution of data) {
    map.set(attribution.addr, attribution);
  }
  return map;
};

export const getUniqueBosAndCsutodiansService = async (entity: string) => {
  const BtcAttribution = await modelFactory.getModel('BtcAttribution');
  const result = await BtcAttribution.aggregate([
    {
      $match: {
        entity: entity
      }
    },
    {
      $project: {
        bo: { $cond: [{ $ne: ["$bo", ""] }, "$bo", "$$REMOVE"] },
        custodian: { $cond: [{ $ne: ["$custodian", ""] }, "$custodian", "$$REMOVE"] }
      }
    },
    {
      $group: {
        _id: null,
        unique_bos: { $addToSet: "$bo" },
        unique_custodians: { $addToSet: "$custodian" }
      }
    },
    {
      $project: {
        _id: 0,
        unique_bos: 1,
        unique_custodians: 1
      }
    }
  ]);

  return result[0] || { unique_bos: [], unique_custodians: [] };
};
