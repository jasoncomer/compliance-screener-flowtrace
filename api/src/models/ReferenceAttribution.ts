import { Document, Schema } from 'mongoose';

export interface IReferenceAttribution {
    address: string;
    entity: string;
    beneficial_owner: string;
    custodian: string;
    sdn_name: string;
}

export interface IReferenceAttributionDocument extends IReferenceAttribution, Document { }

export const referenceAttributionSchema: Schema = new Schema({
    address: { type: String, required: true },
    entity: { type: String, required: true },
    beneficial_owner: { type: String, required: true },
    custodian: { type: String, required: true },
    sdn_name: { type: String, required: true },
});
