import { Schema } from 'mongoose';

export interface BtcTransaction {
  txid: string;
  is_coinjoin: boolean;
  block: number;
  timestamp: number;
  input_amt: number;
  output_amt: number;
  input_cnt: number;
  output_cnt: number;
  fee_amt: number;
  block_date: Date;
  inputs: {
    addr: string;
    amt: number;
    intxid?: string;
    intxid_n?: number;
  }[];
  outputs: {
    n?: number;
    addr: string;
    amt: number;
    outtxid?: string;
  }[];

  // ?
  coinbase: boolean;
}

export interface BtcTransactionDocument extends BtcTransaction, Document { }

export const btcTransactionSchema = new Schema<BtcTransaction>({
  txid: { type: String, required: true },
  block: { type: Number, required: true },
  input_amt: { type: Number, required: true },
  output_amt: { type: Number, required: true },
  input_cnt: { type: Number, required: true },
  output_cnt: { type: Number, required: true },
  fee_amt: { type: Number, required: true },
  block_date: { type: Date, required: true },
  is_coinjoin: { type: Boolean, required: true },
  coinbase: { type: Boolean, required: true },
  timestamp: { type: Number, required: true },
  inputs: [
    {
      addr: { type: String, required: true },
      amt: { type: Number, required: true },
      intxid: { type: String, required: false },
      intxid_n: { type: Number, required: false },
    },
  ],
  outputs: [
    {
      n: { type: Number, required: false },
      outtxid: { type: String, required: false },
      addr: { type: String, required: true },
      amt: { type: Number, required: true },
    },
  ],
});
