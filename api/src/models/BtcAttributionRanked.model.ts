import { Document, Schema } from 'mongoose';

export interface BtcAttributionRanked {
  field: number;
  addr: string;
  cospend_id: string;
  entity_id: string;
  rule_type: string;
  rule_addr: string;
  priority: number;
  source: string;
  date: string;
  priority_rank: number;
}

export interface BtcAttributionRankedDocument extends BtcAttributionRanked, Document { }

export const btcAttributionRankedSchema = new Schema<BtcAttributionRanked>({
  field: { type: Number, required: true },
  addr: { type: String, required: true },
  cospend_id: { type: String, required: true },
  entity_id: { type: String, required: true },
  rule_type: { type: String, required: true },
  rule_addr: { type: String, required: true },
  priority: { type: Number, required: true },
  source: { type: String, required: true },
  date: { type: String, required: true },
  priority_rank: { type: Number, required: true },
});
