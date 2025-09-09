import { db } from '../../../db';
import { 
  dailyOutreachJobs,
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
  private runningJobs: Set<number> = new Set();
  
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
    // Poll every 60 seconds for due jobs
    this.pollingInterval = setInterval(async () => {
      await this.checkAndRunDueJobs();
    }, 60000); // 1 minute
    
    // Run immediately on startup
    this.checkAndRunDueJobs();
  }
  
  private async checkAndRunDueJobs() {
    try {
      // Find all jobs that should run now
      const dueJobs = await db
        .select()
        .from(dailyOutreachJobs)
        .where(
          and(
            lte(dailyOutreachJobs.nextRunAt, new Date()),
            eq(dailyOutreachJobs.status, 'scheduled')
          )
        );
      
      if (dueJobs.length > 0) {
        console.log(`Found ${dueJobs.length} due jobs to process`);
      }
      
      for (const job of dueJobs) {
        // Prevent duplicate runs
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
    this.runningJobs.add(job.userId);
    
    try {
      console.log(`Starting job execution for user ${job.userId}`);
      
      // Mark as running
      await db
        .update(dailyOutreachJobs)
        .set({ status: 'running', updatedAt: new Date() })
        .where(eq(dailyOutreachJobs.id, job.id));
      
      // Execute the actual outreach process
      await this.processUserOutreach(job.userId);
      
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
      
      // Mark as completed and schedule next run
      await db
        .update(dailyOutreachJobs)
        .set({ 
          status: 'scheduled',
          lastRunAt: new Date(),
          nextRunAt: nextRun,
          lastError: null,
          updatedAt: new Date()
        })
        .where(eq(dailyOutreachJobs.id, job.id));
      
      console.log(`Job completed for user ${job.userId}, next run: ${nextRun}`);
      
    } catch (error: any) {
      console.error(`Job failed for user ${job.userId}:`, error);
      
      // Mark as failed
      await db
        .update(dailyOutreachJobs)
        .set({ 
          status: 'failed',
          lastError: error.message || 'Unknown error',
          updatedAt: new Date()
        })
        .where(eq(dailyOutreachJobs.id, job.id));
      
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
  
  private async processUserOutreach(userId: number) {
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
        
        return;
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
      } else {
        console.log(`Failed to generate batch for user ${userId}`);
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