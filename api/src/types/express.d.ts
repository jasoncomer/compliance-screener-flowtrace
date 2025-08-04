import { IUserDocument } from '@src/models';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
      organization?: any; // Replace 'any' with your organization interface type
    }
  }
} 