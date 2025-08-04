import axios from 'axios';
import { IApiBlockCypherResponse } from '@src/typings/typings';

export const isValidCryptoAddress = (address: string): boolean => {
  if (address.startsWith('0x') && address.length === 42) {
    return true;
  }

  // is valid bitcoin address
  if (address.length >= 26 && address.length <= 35) {
    return true;
  }

  return false;
};

export const getAddressData = async (address: string): Promise<IApiBlockCypherResponse> => {
  const url = `https://api.blockcypher.com/v1/btc/main/addrs/${address}/full`;
  const response = await axios.get(url);
  return response.data;
};

export const truncateAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const satsToBTC = (sats: number): number => {
  return sats / 100000000;
};
