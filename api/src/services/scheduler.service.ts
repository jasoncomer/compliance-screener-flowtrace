import { transactionScreeningService } from './transactionScreening.service';
import { CronJobsService } from './cronJobs.service';

/**
 * Service to handle scheduled tasks in the application
 */
export class SchedulerService {
  private schedulerMap: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start all scheduled tasks
   */
  public startAllSchedulers(): void {
    this.startTransactionScreeningScheduler();
    
    // Initialize cron jobs (includes SOT sync)
    CronJobsService.initialize();
    
    console.log('All schedulers started successfully');
  }

  /**
   * Stop all scheduled tasks
   */
  public stopAllSchedulers(): void {
    for (const [name, scheduler] of this.schedulerMap.entries()) {
      clearInterval(scheduler);
      console.log(`Stopped scheduler: ${name}`);
    }
    this.schedulerMap.clear();
    
    // Stop cron jobs
    CronJobsService.stopAll();
    
    console.log('All schedulers stopped successfully');
  }

  /**
   * Start the transaction screening scheduler
   * This will run every 10 minutes by default
   */
  private startTransactionScreeningScheduler(intervalMinutes = 10): void {
    const intervalMs = intervalMinutes * 60 * 1000;

    // Run immediately on startup
    this.runTransactionScreening();

    // Schedule recurring execution
    const intervalId = setInterval(() => {
      this.runTransactionScreening();
    }, intervalMs);

    this.schedulerMap.set('transactionScreening', intervalId);
    console.log(`Transaction screening scheduler started with ${intervalMinutes} minute interval`);
  }

  /**
   * Run the transaction screening process
   */
  private async runTransactionScreening(): Promise<void> {
    try {
      console.log('Running scheduled transaction screening...');
      await transactionScreeningService.processNewTransactions();
      console.log('Scheduled transaction screening completed successfully');
    } catch (error) {
      console.error('Error in scheduled transaction screening:', error);
    }
  }
}

// Export a singleton instance of the scheduler service
export const schedulerService = new SchedulerService(); 