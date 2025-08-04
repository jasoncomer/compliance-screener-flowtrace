import { ErrorRequestHandler, NextFunction, Response } from 'express';
import logger from '@src/logger';

export const errorHandlerMiddleware: ErrorRequestHandler = (
  error,
  req,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) => {
  // Log the error
  logger.error({
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Handle errors
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    error: true,
    message,
    status: statusCode,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  });
};

export default errorHandlerMiddleware; 