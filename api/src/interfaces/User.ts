import { Request } from 'express';
import { IUserDocument } from '@src/models';

export interface IUser {
  _id: string; // TODO: change to ObjectId
  name: string;
  surname: string;
  email: string;
  password: string;
  confirmPassword: string;
  mobileNumber?: string;
  isVerified?: boolean;
  isDeleted?: boolean;
  status?: string;
  confirmationCode?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt?: string;
  updatedAt?: string;
  settings?: {
    showRealCSAMEntityNames?: boolean;
  }
}

export interface IRequestUser extends Request {
  user: IUserDocument;
}

export interface IAuthRequest extends Request {
  headers: { authorization?: string; Authorization?: string };
  cookies: { authToken?: string; accessToken?: string; refreshToken?: string };
  user?: IUserDocument;
}
