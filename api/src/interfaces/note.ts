import { Schema } from 'mongoose';

export interface INoteCreate {
  content: string;
  transactionId?: string;
  address?: string;
  type?: 'general' | 'transaction' | 'address';
}

export interface INote extends INoteCreate {
  organizationId: Schema.Types.ObjectId;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface INoteUpdate {
  content: string;
}

export interface INotePopulated extends INote {
  creatorName?: string;
}