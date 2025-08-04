import { Document, Schema } from 'mongoose';

export interface IBtcWallet {
  addr: string;
  cospend_id: string;
}

export interface IBtcWalletDocument extends IBtcWallet, Document { }

export const btcWalletSchema: Schema = new Schema({
  addr: { type: String, required: true },
  cospend_id: { type: String, required: true },
});
