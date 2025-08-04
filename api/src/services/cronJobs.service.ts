import * as cron from 'node-cron';
import { DistributedLockService } from './distributedLock.service';
import { updateMongoWithSOTSheet } from './sot.service';
import { updateMongoWithEntityTypeMasterlistSheet } from './entityTypeMasterlist.service';

export class CronJobsService {
  private static jobs: Map<string, cron.ScheduledTask> = new Map();
  private static readonly SOT_SYNC_LOCK_KEY = 'sot-sync-lock';
  private static readonly SOT_SYNC_LOCK_DURATION = 10 * 60 * 1000; // 10 minutes
  private static readonly ENTITY_TYPE_MASTERLIST_SYNC_LOCK_KEY = 'entity-type-masterlist-sync-lock';
  private static readonly ENTITY_TYPE_MASTERLIST_SYNC_LOCK_DURATION = 10 * 60 * 1000; // 10 minutes

  /**
   * Initialize all cron jobs
   */
  static initialize(): void {
    console.log('Initializing cron jobs...');

    // Only start cron jobs if enabled via environment variable
    if (process.env.ENABLE_CRON_JOBS !== 'true') {
      console.log('Cron jobs are disabled. Set ENABLE_CRON_JOBS=true to enable.');
      return;
    }

    // Additional check for production environment
    if (process.env.ENABLE_PRODUCTION_CRON !== 'true' && process.env.NODE_ENV === 'production') {
      console.log('Production cron jobs are disabled. Set ENABLE_PRODUCTION_CRON=true to enable in production.');
      return;
    }

    this.initializeSOTSyncJob();
    this.initializeEntityTypeMasterlistSyncJob();
  }

  /**
   * Initialize SOT sync cron job
   */
  private static initializeSOTSyncJob(): void {
    // Run every hour at minute 0
    const cronExpression = '0 * * * *';

    // For testing, you can use '*/1 * * * *' to run every minute
    // const cronExpression = '*/1 * * * *';

    const job = cron.schedule(cronExpression, async () => {
      console.log('Starting scheduled SOT sync...');

      try {
        // Use distributed lock to ensure only one instance runs the sync
        const result = await DistributedLockService.withLock(
          this.SOT_SYNC_LOCK_KEY,
          async () => {
            console.log('Acquired lock for SOT sync, executing update...');
            const syncResult = await updateMongoWithSOTSheet();
            console.log('SOT sync completed successfully:', syncResult);
            return syncResult;
          },
          this.SOT_SYNC_LOCK_DURATION
        );

        if (result === null) {
          console.log('SOT sync skipped - another instance is already running');
        }
      } catch (error) {
        console.error('Error during scheduled SOT sync:', error);
      }
    });

    job.start();
    this.jobs.set('sot-sync', job);

    console.log(`SOT sync cron job initialized. Schedule: ${cronExpression}`);
    console.log(`Next execution: ${this.getNextExecution(cronExpression)}`);
  }

  /**
   * Initialize EntityTypeMasterlist sync cron job
   */
  private static initializeEntityTypeMasterlistSyncJob(): void {
    // Run every hour at minute 15 (slightly offset from SOT sync)
    const cronExpression = '15 * * * *';

    // For testing, you can use '*/2 * * * *' to run every 2 minutes
    // const cronExpression = '*/2 * * * *';

    const job = cron.schedule(cronExpression, async () => {
      console.log('Starting scheduled EntityTypeMasterlist sync...');

      try {
        // Use distributed lock to ensure only one instance runs the sync
        const result = await DistributedLockService.withLock(
          this.ENTITY_TYPE_MASTERLIST_SYNC_LOCK_KEY,
          async () => {
            console.log('Acquired lock for EntityTypeMasterlist sync, executing update...');
            const syncResult = await updateMongoWithEntityTypeMasterlistSheet();
            console.log('EntityTypeMasterlist sync completed successfully:', syncResult);
            return syncResult;
          },
          this.ENTITY_TYPE_MASTERLIST_SYNC_LOCK_DURATION
        );

        if (result === null) {
          console.log('EntityTypeMasterlist sync skipped - another instance is already running');
        }
      } catch (error) {
        console.error('Error during scheduled EntityTypeMasterlist sync:', error);
      }
    });

    job.start();
    this.jobs.set('entity-type-masterlist-sync', job);

    console.log(`EntityTypeMasterlist sync cron job initialized. Schedule: ${cronExpression}`);
    console.log(`Next execution: ${this.getNextExecution(cronExpression)}`);
  }

  /**
   * Stop all cron jobs
   */
  static stopAll(): void {
    console.log('Stopping all cron jobs...');

    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`Stopped cron job: ${name}`);
    });

    this.jobs.clear();
  }

  /**
   * Stop a specific cron job
   */
  static stop(jobName: string): boolean {
    const job = this.jobs.get(jobName);

    if (job) {
      job.stop();
      this.jobs.delete(jobName);
      console.log(`Stopped cron job: ${jobName}`);
      return true;
    }

    return false;
  }

  /**
   * Get status of all cron jobs
   */
  static getStatus(): Record<string, any> {
    const status: Record<string, any> = {
      enabled: process.env.ENABLE_CRON_JOBS === 'true',
      productionEnabled: process.env.ENABLE_PRODUCTION_CRON === 'true',
      jobs: {}
    };

    this.jobs.forEach((job, name) => {
      status.jobs[name] = {
        running: true,
        // You can add more status info here if needed
      };
    });

    return status;
  }

  /**
   * Calculate next execution time for a cron expression
   */
  private static getNextExecution(cronExpression: string): string {
    const interval = cron.validate(cronExpression);
    if (!interval) {
      return 'Invalid cron expression';
    }

    // This is a simple approximation - for more accurate results,
    // you might want to use a library like cron-parser
    const now = new Date();
    const parts = cronExpression.split(' ');

    if (parts[0] === '0' && parts[1] === '*') {
      // Runs at minute 0 of every hour
      const next = new Date(now);
      next.setHours(now.getHours() + 1);
      next.setMinutes(0);
      next.setSeconds(0);
      return next.toISOString();
    }

    return 'Next execution time calculation not implemented for this pattern';
  }

  /**
 * Manually trigger SOT sync (useful for testing)
 */
  static async triggerSOTSync(): Promise<any> {
    console.log('Manually triggering SOT sync...');

    return await DistributedLockService.withLock(
      this.SOT_SYNC_LOCK_KEY,
      async () => {
        const result = await updateMongoWithSOTSheet();
        return result;
      },
      this.SOT_SYNC_LOCK_DURATION
    );
  }

  /**
   * Manually trigger EntityTypeMasterlist sync (useful for testing)
   */
  static async triggerEntityTypeMasterlistSync(): Promise<any> {
    console.log('Manually triggering EntityTypeMasterlist sync...');

    return await DistributedLockService.withLock(
      this.ENTITY_TYPE_MASTERLIST_SYNC_LOCK_KEY,
      async () => {
        const result = await updateMongoWithEntityTypeMasterlistSheet();
        return result;
      },
      this.ENTITY_TYPE_MASTERLIST_SYNC_LOCK_DURATION
    );
  }
}