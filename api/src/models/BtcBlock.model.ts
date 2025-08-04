import { Document, Schema } from 'mongoose';

export interface BtcBlock {
  hash: string;
  size: number;
  stripped_size: number;
  weight: number;
  height: number;
  version: number;
  merkle_root: string;
  timestamp: string;
  timestamp_month: string;
  nonce: string;
  bits: string;
  transaction_count: number;
  fee: number;
}

export interface BtcBlockDocument extends BtcBlock, Document { }

export const btcBlockSchema = new Schema<BtcBlock>({
  hash: { type: String, required: true },
  size: { type: Number, required: true },
  stripped_size: { type: Number, required: true },
  weight: { type: Number, required: true },
  height: { type: Number, required: true },
  version: { type: Number, required: true },
  merkle_root: { type: String, required: true },
  timestamp: { type: String, required: true },
  timestamp_month: { type: String, required: true },
  nonce: { type: String, required: true },
  bits: { type: String, required: true },
  transaction_count: { type: Number, required: true },
  fee: { type: Number, required: true },
});
