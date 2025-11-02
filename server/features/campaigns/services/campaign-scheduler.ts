import { db } from '../../../db';
import { campaigns } from '@shared/schema';
import { eq, and, lte, sql } from 'drizzle-orm';
import { autoSendCampaignService } from './auto-send-service';

export class CampaignScheduler {
  private static instance: CampaignScheduler;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Poll every minute to check for campaigns to activate
  private readonly POLL_INTERVAL_MS = 60 * 1000; // 1 minute
  
  private constructor() {}
  
  static getInstance(): CampaignScheduler {
    if (!CampaignScheduler.instance) {
      CampaignScheduler.instance = new CampaignScheduler();
    }
    return CampaignScheduler.instance;
  }
  
  async start() {
    if (this.isRunning) {
      console.log('[CampaignScheduler] Already running');
      return;
    }
    
    console.log('[CampaignScheduler] Starting campaign scheduler...');
    this.isRunning = true;
    
    // Start the polling mechanism
    this.startPolling();
    
    // Check immediately on startup
    await this.checkAndActivateScheduledCampaigns();
  }
  
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isRunning = false;
    console.log('[CampaignScheduler] Stopped');
  }
  
  private startPolling() {
    // Poll at configured interval for scheduled campaigns
    this.pollingInterval = setInterval(async () => {
      await this.checkAndActivateScheduledCampaigns();
    }, this.POLL_INTERVAL_MS);
    
    console.log(`[CampaignScheduler] Polling every ${this.POLL_INTERVAL_MS / 1000} seconds`);
  }
  
  private async checkAndActivateScheduledCampaigns() {
    try {
      const now = new Date();
      console.log(`[CampaignScheduler] Checking for scheduled campaigns at ${now.toISOString()}`);
      
      // Find all scheduled campaigns where the schedule_date has passed
      const scheduledCampaigns = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, 'scheduled'),
            lte(campaigns.scheduleDate, now)
          )
        );
      
      if (scheduledCampaigns.length === 0) {
        console.log('[CampaignScheduler] No campaigns ready to activate');
        return;
      }
      
      console.log(`[CampaignScheduler] Found ${scheduledCampaigns.length} campaigns ready to activate`);
      
      // Process each scheduled campaign
      for (const campaign of scheduledCampaigns) {
        await this.activateCampaign(campaign);
      }
      
      // After activating campaigns, trigger the auto-send service
      // to process any newly activated campaigns that don't require human review
      await autoSendCampaignService.processAutoSendCampaigns();
      
    } catch (error) {
      console.error('[CampaignScheduler] Error checking scheduled campaigns:', error);
    }
  }
  
  private async activateCampaign(campaign: any) {
    try {
      console.log(`[CampaignScheduler] Activating campaign ${campaign.id}: ${campaign.name}`);
      console.log(`[CampaignScheduler] Scheduled for: ${campaign.scheduleDate}, Current time: ${new Date().toISOString()}`);
      
      // Update campaign status from 'scheduled' to 'active'
      const [updatedCampaign] = await db
        .update(campaigns)
        .set({
          status: 'active',
          startDate: new Date(), // Set the actual start date
          updatedAt: new Date()
        })
        .where(
          and(
            eq(campaigns.id, campaign.id),
            eq(campaigns.status, 'scheduled') // Double-check to avoid race conditions
          )
        )
        .returning();
      
      if (updatedCampaign) {
        console.log(`[CampaignScheduler] ✅ Campaign ${campaign.id} activated successfully`);
        
        // Log the activation details
        console.log(`[CampaignScheduler] Campaign details:`, {
          id: campaign.id,
          name: campaign.name,
          requiresHumanReview: campaign.requiresHumanReview,
          autopilotEnabled: campaign.autopilotEnabled,
          maxEmailsPerDay: campaign.maxEmailsPerDay,
          generationType: campaign.generationType,
          timezone: campaign.timezone,
          scheduleTime: campaign.scheduleTime
        });
      } else {
        console.log(`[CampaignScheduler] Campaign ${campaign.id} was already activated or no longer scheduled`);
      }
      
    } catch (error) {
      console.error(`[CampaignScheduler] Error activating campaign ${campaign.id}:`, error);
    }
  }
  
  // Utility method to manually trigger a check (useful for testing)
  async triggerCheck() {
    console.log('[CampaignScheduler] Manual check triggered');
    await this.checkAndActivateScheduledCampaigns();
  }
}