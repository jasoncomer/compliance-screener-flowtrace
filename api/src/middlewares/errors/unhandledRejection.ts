import logger from '@src/logger';

process.on('unhandledRejection', (reason: Error | any) => {
  console.log(`Unhandled Rejection: ${reason.message || reason}`.red);
  
  // Log the error instead of throwing
  logger.error({
    message: `Unhandled Rejection: ${reason.message || reason}`,
    stack: reason.stack,
    reason: reason
  });
  
  // Don't throw - this prevents crashes
  // throw new Error(reason.message || reason);
});

process.on('uncaughtException', (error: Error) => {
  console.log(`Uncaught Exception: ${error.message}`.inverse);

  logger.error({
    message: `Uncaught Exception: ${error.message}`,
    stack: error.stack
  });

  // Only exit in production to prevent infinite restart loops
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
