import { Schema } from 'mongoose';

export interface IBtcAddressSummary {
  address: string;
  totalReceived: number;
  totalSent: number;
  balance: number;
  txCount: number;
}

export interface IBtcAddress {
  addr: string;
  balance: number;
  first_block: number;
  last_block: number;
  multisig: number;
  script_type: string;
}

export interface IBtcAddressDocument extends IBtcAddress, Document { }

export const btcAddressSchema: Schema = new Schema({
  addr: { type: String, required: true },
  balance: { type: Number, required: true },
  first_block: { type: Number, required: true },
  last_block: { type: Number, required: true },
  multisig: { type: Number, required: true },
  script_type: { type: String, required: true },
});
