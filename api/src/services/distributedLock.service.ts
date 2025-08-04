import { DistributedLockModel } from '../models/distributedLock.model';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

export class DistributedLockService {
  private static readonly DEFAULT_LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
  private static readonly LOCK_RETRY_DELAY_MS = 1000; // 1 second
  private static readonly MAX_RETRIES = 3;

  /**
   * Attempts to acquire a distributed lock
   * @param lockKey - Unique identifier for the lock
   * @param lockDurationMs - How long the lock should be held (default: 5 minutes)
   * @returns Lock ID if successful, null if lock is already held
   */
  static async acquireLock(
    lockKey: string,
    lockDurationMs: number = this.DEFAULT_LOCK_DURATION_MS
  ): Promise<string | null> {
    const lockId = uuidv4();
    const instanceId = `${os.hostname()}-${process.pid}-${lockId}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + lockDurationMs);

    try {
      // First, clean up any expired locks
      await DistributedLockModel.deleteMany({
        lockKey,
        expiresAt: { $lt: now }
      });

      // Try to create a new lock
      await DistributedLockModel.create({
        lockKey,
        lockedBy: instanceId,
        lockedAt: now,
        expiresAt,
        isActive: true
      });

      console.log(`Lock acquired: ${lockKey} by ${instanceId}`);
      return lockId;
    } catch (error: any) {
      // If duplicate key error, lock is already held
      if (error.code === 11000) {
        // Check if the existing lock is still valid
        const existingLock = await DistributedLockModel.findOne({
          lockKey,
          expiresAt: { $gt: now },
          isActive: true
        });

        if (existingLock) {
          console.log(`Lock already held: ${lockKey} by ${existingLock.lockedBy}`);
          return null;
        }

        // If we reach here, there might be a race condition, retry
        return null;
      }
      
      throw error;
    }
  }

  /**
   * Releases a distributed lock
   * @param lockKey - Unique identifier for the lock
   * @param lockId - The lock ID returned from acquireLock
   */
  static async releaseLock(lockKey: string, lockId: string): Promise<boolean> {
    const instanceId = `${os.hostname()}-${process.pid}-${lockId}`;
    
    const result = await DistributedLockModel.deleteOne({
      lockKey,
      lockedBy: instanceId,
      isActive: true
    });

    if (result.deletedCount > 0) {
      console.log(`Lock released: ${lockKey} by ${instanceId}`);
      return true;
    }

    console.log(`Lock not found or already released: ${lockKey}`);
    return false;
  }

  /**
   * Attempts to acquire a lock with retries
   * @param lockKey - Unique identifier for the lock
   * @param lockDurationMs - How long the lock should be held
   * @param maxRetries - Maximum number of retry attempts
   * @returns Lock ID if successful, null if all retries failed
   */
  static async acquireLockWithRetry(
    lockKey: string,
    lockDurationMs: number = this.DEFAULT_LOCK_DURATION_MS,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<string | null> {
    for (let i = 0; i <= maxRetries; i++) {
      const lockId = await this.acquireLock(lockKey, lockDurationMs);
      
      if (lockId) {
        return lockId;
      }

      if (i < maxRetries) {
        console.log(`Failed to acquire lock ${lockKey}, retrying in ${this.LOCK_RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.LOCK_RETRY_DELAY_MS));
      }
    }

    console.log(`Failed to acquire lock ${lockKey} after ${maxRetries} retries`);
    return null;
  }

  /**
   * Executes a function with a distributed lock
   * @param lockKey - Unique identifier for the lock
   * @param fn - Function to execute while holding the lock
   * @param lockDurationMs - How long the lock should be held
   * @returns Result of the function execution
   */
  static async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    lockDurationMs: number = this.DEFAULT_LOCK_DURATION_MS
  ): Promise<T | null> {
    const lockId = await this.acquireLockWithRetry(lockKey, lockDurationMs);
    
    if (!lockId) {
      console.error(`Unable to acquire lock for ${lockKey}`);
      return null;
    }

    try {
      const result = await fn();
      return result;
    } finally {
      await this.releaseLock(lockKey, lockId);
    }
  }
}