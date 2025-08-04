import { Schema } from 'mongoose';

import { ICase } from '@src/interfaces';

export const caseSchema: Schema<ICase> = new Schema({
  addresses: [
    {
      type: String,
      required: true,
    },
  ],
  clientEmail: {
    type: String,
    default: '',
  },
  clientName: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    default: 'active',
  },
  userId: {
    type: String,
  },
  caseId: {
    type: String,
  },
});
