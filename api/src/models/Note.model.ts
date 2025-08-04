import mongoose, { Schema, Document, Model } from 'mongoose';
import { INote } from '@src/interfaces/note';

export interface INoteDocument extends Omit<INote, '_id'>, Document {
  // Add instance methods here
}

interface INoteModel extends Model<INoteDocument> {
  // Add static methods here
  findByOrganization(orgId: string): Promise<INoteDocument[]>;
}

export const NoteSchema = new Schema<INoteDocument, INoteModel>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    content: {
      type: String,
      required: [true, 'Note content is required'],
      trim: true,
      maxlength: [5000, 'Note content cannot exceed 5000 characters']
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required']
    },
    transactionId: {
      type: String,
      required: false,
      index: true
    },
    address: {
      type: String,
      required: false,
      index: true
    },
    type: {
      type: String,
      enum: ['general', 'transaction', 'address'],
      default: 'general',
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'notes'
  }
);

// Index for faster queries
NoteSchema.index({ organizationId: 1, createdAt: -1 });
NoteSchema.index({ organizationId: 1, transactionId: 1 });
NoteSchema.index({ organizationId: 1, address: 1 });

// Add validation or pre-save hooks
NoteSchema.pre('save', function (next) {
  // Additional validation or modifications could go here
  next();
}); 