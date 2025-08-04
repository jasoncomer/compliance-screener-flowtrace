import { NextFunction, Request, Response } from 'express';
import { submitContactSalesService, getContactSalesRequestsService } from '@src/services/contactSales.service';

export const submitContactSalesController = (req: Request, res: Response, next: NextFunction) =>
  submitContactSalesService(req, res, next);

export const getContactSalesRequestsController = (req: Request, res: Response, next: NextFunction) =>
  getContactSalesRequestsService(req, res, next); 