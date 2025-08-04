import app from '@src/app';
import { connectDB, environmentConfig } from '@src/configs';
import { connectionManager } from '@src/db/connectionManager';
import logger from '@src/logger';
import { schedulerService } from '@src/services/scheduler.service';
import { initializeTierSystem } from '@src/configs/tier-config';

// env setup
const env = process.env.NODE_ENV;
logger.info(`Environment: ${env}`);

let server: any;

// Connecting to MongoDB and Starting Server
export const startServer = async () => {
  try {
    const conn = await connectDB(
      env === 'testing'
        ? environmentConfig.TEST_ENV_MONGODB_CONNECTION_STRING
        : environmentConfig.MONGODB_CONNECTION_STRING
    );

    logger.info(`MongoDB database connection established successfully to... ${conn?.connection?.host}`);

    // Initialize and validate subscription tier system
    initializeTierSystem();
    logger.info('Subscription tier system initialized successfully');

    server = app?.listen(environmentConfig.PORT, () => {
      logger.info(`Server is listening on port: http://localhost:${environmentConfig.PORT} ....`);
    });

    // Start all schedulers
    if (env !== 'testing') {
      schedulerService.startAllSchedulers();
      logger.info('All scheduled tasks have been started');
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      try {
        logger.info('\nReceived SIGINT. Starting graceful shutdown...');

        // Stop all schedulers
        schedulerService.stopAllSchedulers();
        logger.info('All scheduled tasks have been stopped');

        // Close the HTTP server
        await new Promise((resolve) => {
          server.close(resolve);
        });
        logger.info('HTTP server closed.');

        // Close all database connections
        await connectionManager.closeAll();

        logger.info('Graceful shutdown completed.');
        process.exit(0);
      } catch (error: any) {
        logger.error({
          message: `Error during graceful shutdown: ${error?.message}`,
        });
        process.exit(1);
      }
    });

  } catch (error: any) {
    logger.error('MongoDB connection error. Please make sure MongoDB is running.');
    logger.error({
      message: `MongoDB connection error. Please make sure MongoDB is running: ${error?.message}`,
    });
  }
};

// Establish http server connection
startServer();

export default app;
