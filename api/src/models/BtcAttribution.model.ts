import { Document, Schema } from 'mongoose';

export interface BtcAttribution {
  addr: string;
  entity: string;
  bo: string;
  custodian: string;
  script_type?: string;
  cospend_id?: string;
}

export interface BtcAttributionDocument extends BtcAttribution, Document { }

export const btcAttributionSchema = new Schema<BtcAttribution>({
  addr: { type: String, required: true },
  entity: { type: String, default: null },
  bo: { type: String, default: null },
  custodian: { type: String, default: null },
  script_type: { type: String, default: null },
  cospend_id: { type: String, default: null },
});
