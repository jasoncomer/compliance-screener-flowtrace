import { NextFunction, Response, Request } from 'express';
import createHttpError from 'http-errors';
import { AuthenticatedRequestBody, ICase, ICaseCreate, IAuthRequest } from '@src/interfaces';

import { customResponse } from '@src/utils';
import { padZero } from '@src/utils/string';
import { modelFactory } from '@src/db/modelFactory';

export const createCase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req as AuthenticatedRequestBody<ICaseCreate>;
    const { addresses, clientEmail, clientName, notes, status } = req.body as ICaseCreate;

    if (!user) {
      return next(createHttpError(400, `User is missing`));
    }

    const Case = await modelFactory.getModel('Case');
    const existingCase = await Case.find({ userId: user._id });
    const prevCases = existingCase?.length ?? 0;

    const caseDoc = new Case({
      userId: user._id,
      caseId: `blk-${padZero(prevCases + 1, 4)}`,
      addresses,
      clientEmail,
      clientName,
      notes,
      status,
    });
    await caseDoc.save();

    return res.status(201).json(
      customResponse<ICase>({
        data: caseDoc,
        success: true,
        error: false,
        message: `Case created successfully with id ${caseDoc._id} `,
        status: 201,
      })
    );
  } catch (err) {
    return next(createHttpError(500, err as string));
  }
};

export const getCases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req as AuthenticatedRequestBody<ICase[]>;
    if (!user) {
      return next(createHttpError(400, `User is missing`));
    }

    const Case = await modelFactory.getModel('Case');
    const cases = await Case.find({ userId: user?._id });

    return res.status(200).json(
      customResponse<ICase[]>({
        data: cases,
        success: true,
        error: false,
        message: 'Cases fetched successfully',
        status: 200,
      })
    );
  } catch (err) {
    return next(createHttpError(500, err as string));
  }
};

export const deleteCase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req as AuthenticatedRequestBody<string>;
    if (!user) {
      return next(createHttpError(400, `User is missing`));
    }

    const { caseId } = (req as any).params;
    const Case = await modelFactory.getModel('Case');
    const caseDoc = await Case.findOneAndDelete({ _id: caseId, userId: user._id });
    if (!caseDoc) {
      return next(createHttpError(404, `Case not found`));
    }

    return res.status(200).json(
      customResponse<ICase>({
        data: caseDoc,
        success: true,
        error: false,
        message: `Case deleted successfully`,
        status: 200,
      })
    );
  } catch (err) {
    return next(createHttpError(500, err as string));
  }
};
