import { Types } from "mongoose";

export interface IContactSales {
  userId?: Types.ObjectId;
  email: string;
  company: string;
  companySize: string;
  message: string;
  status?: 'pending' | 'contacted' | 'closed';
  contactedAt?: Date;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
} 