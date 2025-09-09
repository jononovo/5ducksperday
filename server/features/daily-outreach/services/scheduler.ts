import * as cron from 'node-cron';
import { db } from '../../../db';
import { userOutreachPreferences, users } from '@shared/schema';
import { eq, and, or, isNull, lt } from 'drizzle-orm';
import { batchGenerator } from './batch-generator';
import { sendGridService } from './sendgrid-service';
import { OutreachScheduleCheck } from '../types';

export class DailyOutreachScheduler {
  private scheduledTasks: Map<number, cron.ScheduledTask> = new Map();
  
  async initialize() {
    console.log('Initializing Daily Outreach Scheduler...');
    
    // Load all users with outreach enabled
    const activePreferences = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.enabled, true));
    
    // Schedule tasks for each user
    for (const pref of activePreferences) {
      this.scheduleUserOutreach(pref.userId, pref);
    }
    
    console.log(`Scheduled ${activePreferences.length} daily outreach tasks`);
  }
  
  private scheduleUserOutreach(userId: number, preferences: any) {
    // Stop existing task if any
    const existingTask = this.scheduledTasks.get(userId);
    if (existingTask) {
      existingTask.stop();
    }
    
    // Parse schedule time (e.g., "09:00" => hour: 9, minute: 0)
    const [hour, minute] = preferences.scheduleTime.split(':').map(Number);
    
    // Build cron expression based on schedule days
    // Monday = 1, Tuesday = 2, Wednesday = 3, etc.
    const dayMapping = {
      'mon': 1,
      'tue': 2,
      'wed': 3,
      'thu': 4,
      'fri': 5,
      'sat': 6,
      'sun': 0
    };
    
    const days = preferences.scheduleDays
      .map((day: string) => dayMapping[day as keyof typeof dayMapping])
      .filter((d: number) => d !== undefined)
      .join(',');
    
    // Cron format: minute hour * * day-of-week
    const cronExpression = `${minute} ${hour} * * ${days}`;
    
    console.log(`Scheduling outreach for user ${userId}: ${cronExpression} (${preferences.timezone})`);
    
    // Create scheduled task
    const task = cron.schedule(cronExpression, () => {
      this.processUserOutreach(userId);
    }, {
      timezone: preferences.timezone
    });
    
    this.scheduledTasks.set(userId, task);
  }
  
  async processUserOutreach(userId: number) {
    try {
      console.log(`Processing daily outreach for user ${userId}`);
      
      // Check if we should send today
      const shouldSend = await this.shouldSendToday(userId);
      if (!shouldSend) {
        console.log(`Skipping outreach for user ${userId} - already sent today`);
        return;
      }
      
      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        console.error(`User ${userId} not found`);
        return;
      }
      
      // Generate batch of 5 contacts
      const batch = await batchGenerator.generateDailyBatch(userId);
      
      // Send email notification
      const sent = await sendGridService.sendDailyNudgeEmail(user, batch);
      
      if (sent) {
        // Update last nudge sent timestamp
        await db
          .update(userOutreachPreferences)
          .set({ lastNudgeSent: new Date() })
          .where(eq(userOutreachPreferences.userId, userId));
        
        console.log(`Daily outreach email sent to user ${userId}`);
      }
    } catch (error) {
      console.error(`Error processing outreach for user ${userId}:`, error);
    }
  }
  
  private async shouldSendToday(userId: number): Promise<boolean> {
    const [pref] = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId));
    
    if (!pref || !pref.enabled) {
      return false;
    }
    
    // Check if already sent today
    if (pref.lastNudgeSent) {
      const lastSent = new Date(pref.lastNudgeSent);
      const today = new Date();
      
      // If sent today already, skip
      if (
        lastSent.getDate() === today.getDate() &&
        lastSent.getMonth() === today.getMonth() &&
        lastSent.getFullYear() === today.getFullYear()
      ) {
        return false;
      }
    }
    
    return true;
  }
  
  async updateUserPreferences(userId: number, preferences: any) {
    // Reschedule the task with new preferences
    this.scheduleUserOutreach(userId, preferences);
  }
  
  async disableUserOutreach(userId: number) {
    // Stop and remove the scheduled task
    const task = this.scheduledTasks.get(userId);
    if (task) {
      task.stop();
      this.scheduledTasks.delete(userId);
      console.log(`Disabled outreach for user ${userId}`);
    }
  }
  
  // Manual trigger for testing
  async triggerManualOutreach(userId: number) {
    console.log(`Manual trigger for user ${userId}`);
    await this.processUserOutreach(userId);
  }
  
  shutdown() {
    console.log('Shutting down Daily Outreach Scheduler...');
    // Stop all scheduled tasks
    this.scheduledTasks.forEach((task, userId) => {
      task.stop();
    });
    this.scheduledTasks.clear();
  }
}

export const outreachScheduler = new DailyOutreachScheduler();