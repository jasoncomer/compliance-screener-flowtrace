import { NextFunction, Response, Request } from 'express';

import { AuthenticatedRequestBody, IUser, ProcessingStripeCheckoutT } from '@src/interfaces';
import {
  captureStripePaymentService,
  createStripeCheckoutSessionService,
  getStripePublicKeyService,
} from '@src/services';

export const getStripePublicKeyController = (req: Request, res: Response, next: NextFunction) =>
  getStripePublicKeyService(req, res, next);

export const captureStripePaymentController = (
  req: Request,
  res: Response,
  next: NextFunction
) => captureStripePaymentService(req, res, next);

export const createStripeCheckoutController = (
  req: Request,
  res: Response,
  next: NextFunction
) => createStripeCheckoutSessionService(req, res, next);
