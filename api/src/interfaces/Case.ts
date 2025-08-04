import { Document } from 'mongoose';

export enum ECaseStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
}

export interface ICaseCreate {
  userId: string;
  status: string;
  addresses: string[];
  clientName: string;
  clientEmail: string;
  notes: string;
}

export interface ICase extends ICaseCreate {
  caseId: string;
}

export interface ICaseDocument extends ICase, Document { }
