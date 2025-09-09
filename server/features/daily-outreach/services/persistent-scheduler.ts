import { db } from '../../../db';
import { 
  dailyOutreachJobs,
  dailyOutreachJobLogs,
  userOutreachPreferences,
  users,
  dailyOutreachBatches,
  dailyOutreachItems,
  contacts,
  companies
} from '@shared/schema';
import { eq, and, lte, isNull, sql, inArray, not } from 'drizzle-orm';
import { batchGenerator } from './batch-generator';
import { sendGridService } from './sendgrid-service';
import { differenceInMinutes } from 'date-fns';

export class PersistentDailyOutreachScheduler {
  private pollingInterval: NodeJS.Timeout | null = null;
  private runningJobs: Map<number, Date> = new Map(); // Track userId -> startTime
  private readonly POLL_INTERVAL_MS: number;
  private readonly BATCH_SIZE: number;
  private readonly MAX_CONCURRENT: number;
  private readonly MAX_RETRIES: number;
  private readonly RETRY_DELAYS = [60, 300, 900]; // 1min, 5min, 15min in seconds
  
  constructor() {
    // Configurable via environment variables with sensible defaults
    this.POLL_INTERVAL_MS = parseInt(process.env.OUTREACH_POLL_INTERVAL || '30000', 10);
    this.BATCH_SIZE = parseInt(process.env.OUTREACH_BATCH_SIZE || '15', 10);
    this.MAX_CONCURRENT = parseInt(process.env.OUTREACH_MAX_CONCURRENT || '10', 10);
    this.MAX_RETRIES = parseInt(process.env.OUTREACH_MAX_RETRIES || '3', 10);
    
    console.log(`Scheduler config: Poll=${this.POLL_INTERVAL_MS}ms, Batch=${this.BATCH_SIZE}, MaxConcurrent=${this.MAX_CONCURRENT}, MaxRetries=${this.MAX_RETRIES}`);
  }
  
  async initialize() {
    console.log('Initializing Persistent Daily Outreach Scheduler...');
    
    // Load all users with outreach enabled
    const activePreferences = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.enabled, true));
    
    // Initialize or update job records for each user
    for (const pref of activePreferences) {
      await this.ensureJobExists(pref.userId, pref);
    }
    
    // Start the polling mechanism (runs every minute)
    this.startPolling();
    
    console.log(`Persistent scheduler initialized for ${activePreferences.length} users`);
  }
  
  private async ensureJobExists(userId: number, preferences: any) {
    const [existingJob] = await db
      .select()
      .from(dailyOutreachJobs)
      .where(eq(dailyOutreachJobs.userId, userId));
    
    if (!existingJob) {
      // Calculate next run time based on preferences
      const nextRun = this.calculateNextRun(preferences);
      
      await db.insert(dailyOutreachJobs).values({
        userId,
        nextRunAt: nextRun,
        status: 'scheduled'
      });
      
      console.log(`Created job for user ${userId}, next run: ${nextRun}`);
    } else if (existingJob.status === 'failed') {
      // Reset failed jobs
      const nextRun = this.calculateNextRun(preferences);
      await db
        .update(dailyOutreachJobs)
        .set({ 
          nextRunAt: nextRun, 
          status: 'scheduled',
          lastError: null 
        })
        .where(eq(dailyOutreachJobs.userId, userId));
        
      console.log(`Reset failed job for user ${userId}, next run: ${nextRun}`);
    }
  }
  
  private startPolling() {
    // Poll at configured interval for due jobs
    this.pollingInterval = setInterval(async () => {
      await this.checkAndRunDueJobs();
    }, this.POLL_INTERVAL_MS);
    
    // Run immediately on startup
    this.checkAndRunDueJobs();
  }
  
  private async checkAndRunDueJobs() {
    try {
      // Clean up stale running jobs (older than 5 minutes)
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      for (const [userId, startTime] of Array.from(this.runningJobs.entries())) {
        if (startTime < staleThreshold) {
          console.log(`Removing stale job for user ${userId}`);
          this.runningJobs.delete(userId);
        }
      }
      
      // Check current concurrency
      const currentRunning = this.runningJobs.size;
      if (currentRunning >= this.MAX_CONCURRENT) {
        console.log(`Max concurrent jobs reached (${currentRunning}/${this.MAX_CONCURRENT}), waiting...`);
        return;
      }
      
      // Calculate how many jobs we can take
      const slotsAvailable = this.MAX_CONCURRENT - currentRunning;
      const batchLimit = Math.min(this.BATCH_SIZE, slotsAvailable);
      
      // Find jobs that should run now with fair ordering
      const dueJobs = await db
        .select()
        .from(dailyOutreachJobs)
        .where(
          sql`(
            (status = 'scheduled' AND next_run_at <= NOW()) OR
            (status = 'failed' AND retry_count < ${this.MAX_RETRIES} AND 
             (next_retry_at IS NULL OR next_retry_at <= NOW()))
          )`
        )
        .orderBy(
          sql`CASE 
            WHEN status = 'failed' AND retry_count < ${this.MAX_RETRIES} THEN 0
            ELSE 1 
          END`,
          sql`next_run_at ASC`
        )
        .limit(batchLimit);
      
      if (dueJobs.length > 0) {
        console.log(`Processing batch of ${dueJobs.length} jobs (${currentRunning} running, ${batchLimit} slots available)`);
      }
      
      // Process jobs without blocking
      for (const job of dueJobs) {
        // Skip if already running (double-check)
        if (this.runningJobs.has(job.userId)) {
          console.log(`Job for user ${job.userId} already running, skipping`);
          continue;
        }
        
        // Run job asynchronously
        this.executeJob(job);
      }
    } catch (error) {
      console.error('Error checking due jobs:', error);
    }
  }
  
  private async executeJob(job: any) {
    this.runningJobs.set(job.userId, new Date());
    const startTime = Date.now();
    let batchId: number | null = null;
    let contactsProcessed = 0;
    
    try {
      console.log(`Starting job execution for user ${job.userId}`);
      
      // Mark as running
      await db
        .update(dailyOutreachJobs)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(dailyOutreachJobs.id, job.id));
      
      // Execute the actual outreach process
      const result = await this.processUserOutreach(job.userId);
      batchId = result?.batchId || null;
      contactsProcessed = result?.contactsProcessed || 0;
      
      // Calculate next run time
      const [preferences] = await db
        .select()
        .from(userOutreachPreferences)
        .where(eq(userOutreachPreferences.userId, job.userId));
      
      if (!preferences || !preferences.enabled) {
        console.log(`User ${job.userId} has disabled outreach, removing job`);
        await db
          .delete(dailyOutreachJobs)
          .where(eq(dailyOutreachJobs.id, job.id));
        return;
      }
      
      const nextRun = this.calculateNextRun(preferences);
      
      // Mark as completed and schedule next run (reset retry count on success)
      await db
        .update(dailyOutreachJobs)
        .set({ 
          status: 'scheduled',
          lastRunAt: new Date(),
          nextRunAt: nextRun,
          lastError: null,
          retryCount: 0,
          nextRetryAt: null,
          updatedAt: new Date()
        })
        .where(eq(dailyOutreachJobs.id, job.id));
      
      // Log successful execution to audit trail
      const processingTime = Date.now() - startTime;
      await db.insert(dailyOutreachJobLogs).values({
        jobId: job.id,
        userId: job.userId,
        executedAt: new Date(),
        status: 'success',
        batchId: batchId,
        processingTimeMs: processingTime,
        contactsProcessed: contactsProcessed
      });
      
      console.log(`Job completed for user ${job.userId}, next run: ${nextRun}, processing time: ${processingTime}ms`);
      
    } catch (error: any) {
      console.error(`Job failed for user ${job.userId}:`, error);
      
      const newRetryCount = (job.retryCount || 0) + 1;
      const shouldRetry = newRetryCount < this.MAX_RETRIES;
      
      if (shouldRetry) {
        // Calculate next retry time with exponential backoff
        const retryDelaySeconds = this.RETRY_DELAYS[Math.min(newRetryCount - 1, this.RETRY_DELAYS.length - 1)];
        const nextRetryAt = new Date(Date.now() + retryDelaySeconds * 1000);
        
        console.log(`Job for user ${job.userId} will retry (attempt ${newRetryCount}/${this.MAX_RETRIES}) at ${nextRetryAt}`);
        
        // Mark as failed but retryable
        await db
          .update(dailyOutreachJobs)
          .set({ 
            status: 'failed',
            lastError: error.message || 'Unknown error',
            retryCount: newRetryCount,
            nextRetryAt: nextRetryAt,
            updatedAt: new Date()
          })
          .where(eq(dailyOutreachJobs.id, job.id));
      } else {
        console.log(`Job for user ${job.userId} has exhausted all retries (${this.MAX_RETRIES})`);
        
        // Mark as permanently failed
        await db
          .update(dailyOutreachJobs)
          .set({ 
            status: 'failed',
            lastError: `Failed after ${this.MAX_RETRIES} retries: ${error.message || 'Unknown error'}`,
            retryCount: newRetryCount,
            updatedAt: new Date()
          })
          .where(eq(dailyOutreachJobs.id, job.id));
      }
      
      // Log failed execution to audit trail
      const processingTime = Date.now() - startTime;
      await db.insert(dailyOutreachJobLogs).values({
        jobId: job.id,
        userId: job.userId,
        executedAt: new Date(),
        status: shouldRetry ? 'failed' : 'failed_permanent',
        processingTimeMs: processingTime,
        errorMessage: error.message || 'Unknown error'
      });
      
    } finally {
      this.runningJobs.delete(job.userId);
    }
  }
  
  private calculateNextRun(preferences: any): Date {
    const now = new Date();
    const scheduleTime = preferences.scheduleTime || '09:00';
    const [hour, minute] = scheduleTime.split(':').map(Number);
    const scheduleDays = preferences.scheduleDays || ['mon', 'tue', 'wed'];
    
    // Find next scheduled day
    const dayMap: { [key: string]: number } = { 
      'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 
      'thu': 4, 'fri': 5, 'sat': 6 
    };
    
    const scheduledDayNumbers = scheduleDays.map((d: string) => dayMap[d]);
    let nextRun = new Date(now);
    
    // Set time
    nextRun.setHours(hour, minute, 0, 0);
    
    // If today's time has passed, start from tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
    
    // Find next scheduled day
    let daysChecked = 0;
    while (!scheduledDayNumbers.includes(nextRun.getDay()) && daysChecked < 7) {
      nextRun.setDate(nextRun.getDate() + 1);
      daysChecked++;
    }
    
    // If no valid day found (shouldn't happen), default to tomorrow
    if (daysChecked >= 7) {
      nextRun = new Date(now);
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(hour, minute, 0, 0);
    }
    
    return nextRun;
  }
  
  private async processUserOutreach(userId: number): Promise<{ batchId: number | null; contactsProcessed: number }> {
    console.log(`Processing daily outreach for user ${userId}`);
    
    try {
      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Check vacation mode
      const [preferences] = await db
        .select()
        .from(userOutreachPreferences)
        .where(eq(userOutreachPreferences.userId, userId));
      
      // Check if user is on vacation (if vacation mode fields exist)
      // This is for future implementation when vacation fields are added
      
      // Check available contacts
      const availableCount = await this.checkAvailableContacts(userId);
      
      if (availableCount < 5) {
        console.log(`User ${userId} has insufficient contacts (${availableCount})`);
        // Send "need more contacts" email
        await sendGridService.sendDailyNudgeEmail(user, null);
        
        // Update last nudge sent
        await db
          .update(userOutreachPreferences)
          .set({ lastNudgeSent: new Date() })
          .where(eq(userOutreachPreferences.userId, userId));
        
        return { batchId: null, contactsProcessed: 0 };
      }
      
      // Generate batch
      const batch = await batchGenerator.generateDailyBatch(userId);
      
      if (batch) {
        // Send notification email with batch details
        await sendGridService.sendDailyNudgeEmail(user, batch);
        
        // Update last nudge sent
        await db
          .update(userOutreachPreferences)
          .set({ lastNudgeSent: new Date() })
          .where(eq(userOutreachPreferences.userId, userId));
        
        console.log(`Daily outreach processed successfully for user ${userId}`);
        return { batchId: batch.id, contactsProcessed: batch.items.length };
      } else {
        console.log(`Failed to generate batch for user ${userId}`);
        return { batchId: null, contactsProcessed: 0 };
      }
      
    } catch (error) {
      console.error(`Error processing outreach for user ${userId}:`, error);
      throw error;
    }
  }
  
  private async checkAvailableContacts(userId: number): Promise<number> {
    // Get contacts that haven't been included in any outreach items
    const usedContactIds = await db
      .select({ contactId: dailyOutreachItems.contactId })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachItems.batchId, dailyOutreachBatches.id))
      .where(eq(dailyOutreachBatches.userId, userId));
    
    const usedIds = usedContactIds.map(r => r.contactId);
    
    // Count available contacts with emails
    const baseConditions = and(
      eq(companies.userId, userId),
      not(isNull(contacts.email))
    );
    
    const conditions = usedIds.length > 0 
      ? and(
          baseConditions,
          not(inArray(contacts.id, usedIds))
        )
      : baseConditions;
    
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .where(conditions);
    
    return result?.count || 0;
  }
  
  async updateUserPreferences(userId: number, preferences: any) {
    // Update the job's next run time when preferences change
    const nextRun = this.calculateNextRun(preferences);
    
    const [existingJob] = await db
      .select()
      .from(dailyOutreachJobs)
      .where(eq(dailyOutreachJobs.userId, userId));
    
    if (existingJob) {
      await db
        .update(dailyOutreachJobs)
        .set({ 
          nextRunAt: nextRun,
          status: 'scheduled',
          updatedAt: new Date()
        })
        .where(eq(dailyOutreachJobs.userId, userId));
      
      console.log(`Updated job for user ${userId}, next run: ${nextRun}`);
    } else if (preferences.enabled) {
      // Create new job if doesn't exist
      await db.insert(dailyOutreachJobs).values({
        userId,
        nextRunAt: nextRun,
        status: 'scheduled'
      });
      
      console.log(`Created new job for user ${userId}, next run: ${nextRun}`);
    }
  }
  
  async disableUserOutreach(userId: number) {
    // Remove job when user disables outreach
    await db
      .delete(dailyOutreachJobs)
      .where(eq(dailyOutreachJobs.userId, userId));
    
    console.log(`Removed job for user ${userId} (outreach disabled)`);
  }
  
  // Get job status for monitoring
  async getJobStatus(userId: number) {
    const [job] = await db
      .select()
      .from(dailyOutreachJobs)
      .where(eq(dailyOutreachJobs.userId, userId));
    
    if (job) {
      return {
        ...job,
        nextRunIn: job.nextRunAt ? differenceInMinutes(new Date(job.nextRunAt), new Date()) : null
      };
    }
    
    return null;
  }
  
  shutdown() {
    console.log('Shutting down Persistent Daily Outreach Scheduler...');
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}

export const persistentScheduler = new PersistentDailyOutreachScheduler();