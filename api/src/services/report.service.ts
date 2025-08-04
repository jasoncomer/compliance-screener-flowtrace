import { NextFunction, Request, Response } from 'express';
import createHttpError from 'http-errors';
import { IReport } from '@src/typings/typings';
import { getAddressData } from '@src/utils/crypto';
import { createPDFReport } from '@src/utils/pdf';

export const createReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body } = req;
    const { address } = body;

    if (!address) {
      return next(createHttpError(400, `Address is required`));
    }

    // const isValid = isValidCryptoAddress(address);
    // if (!isValid) {
    //   return next(createHttpError(400, `Invalid address`));
    // }

    // Set the response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${address}.pdf`);

    const addressData = await getAddressData(address);
    const { balance, txs } = addressData;

    // create a pdf report
    const report: IReport = {
      address,
      currentBalance: balance,
      totalReceived: addressData.total_received,
      totalSent: addressData.total_sent,
      txs,
      transactionCount: txs.length,
    };
    console.log(report);
    createPDFReport(report, res);
  } catch (error) {
    return next(createHttpError.InternalServerError(error as string));
  }
};
