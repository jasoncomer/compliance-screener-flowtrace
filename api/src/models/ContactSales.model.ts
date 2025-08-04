import { Schema, Document } from 'mongoose';
import { IContactSales } from '@src/interfaces';

export interface IContactSalesDocument extends IContactSales, Document { }

export const ContactSalesSchema: Schema<IContactSalesDocument> = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email',
      ],
      maxLength: [128, "Email can't be greater than 128 characters"],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxLength: [100, "Company name can't be greater than 100 characters"],
    },
    companySize: {
      type: String,
      required: [true, 'Company size is required'],
      enum: ['1-10', '11-50', '51-200', '201-1000', '1000+'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxLength: [2000, "Message can't be greater than 2000 characters"],
    },
    status: {
      type: String,
      enum: ['pending', 'contacted', 'closed'],
      default: 'pending',
    },
    contactedAt: {
      type: Date,
      required: false,
    },
    notes: {
      type: String,
      trim: true,
      maxLength: [1000, "Notes can't be greater than 1000 characters"],
      required: false,
    },
    ipAddress: {
      type: String,
      required: false,
    },
    userAgent: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
); 