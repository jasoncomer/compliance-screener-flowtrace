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
let isShuttingDown = false;

// Process monitoring
const startProcessMonitoring = () => {
  // Monitor memory usage
  setInterval(() => {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    // Log if memory usage is high
    if (memUsageMB.heapUsed > 500) { // 500MB threshold
      logger.warn(`High memory usage detected: ${JSON.stringify(memUsageMB)}`);
    }
  }, 60000); // Check every minute

  // Monitor event loop lag
  let lastCheck = Date.now();
  setInterval(() => {
    const now = Date.now();
    const lag = now - lastCheck - 1000; // Should be ~1000ms
    if (lag > 100) { // More than 100ms lag
      logger.warn(`Event loop lag detected: ${lag}ms`);
    }
    lastCheck = now;
  }, 1000);
};

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

    // Start process monitoring
    startProcessMonitoring();

    // Start all schedulers
    if (env !== 'testing') {
      schedulerService.startAllSchedulers();
      logger.info('All scheduled tasks have been started');
    }

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await gracefulShutdown('SIGINT');
    });

    process.on('SIGTERM', async () => {
      await gracefulShutdown('SIGTERM');
    });

  } catch (error: any) {
    logger.error('MongoDB connection error. Please make sure MongoDB is running.');
    logger.error({
      message: `MongoDB connection error. Please make sure MongoDB is running: ${error?.message}`,
    });
  }
};

// Graceful shutdown function
const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    logger.info('Shutdown already in progress...');
    return;
  }
  
  isShuttingDown = true;
  
  try {
    logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);

    // Stop all schedulers
    schedulerService.stopAllSchedulers();
    logger.info('All scheduled tasks have been stopped');

    // Close the HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      logger.info('HTTP server closed.');
    }

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
};

// Establish http server connection
startServer();

export default app;
