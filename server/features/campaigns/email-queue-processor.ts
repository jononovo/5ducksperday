import { storage } from "../../storage";
import { db } from "../../db";
import { campaignRecipients, campaigns, communicationHistory, contacts } from "@shared/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { generateEmailContent } from "../email-generation/generator";
import type { Campaign, CampaignRecipient } from "@shared/schema";
import sgMail from '@sendgrid/mail';
import { GmailOAuthService } from '../../gmail-api-service/oauth/service';
import { TokenService } from '../billing/tokens/service';
import { resolveAllMergeFields, buildMergeContext } from '../../lib/merge-field-resolver';

const BATCH_SIZE = 20; // Process 20 recipients at a time
const PROCESSING_INTERVAL = 30000; // Check every 30 seconds (reduced from 10s for efficiency)
const SENDING_INTERVAL = 20000; // Check for emails to send every 20 seconds (reduced from 5s for efficiency)

// Initialize SendGrid (optional, not default)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export class EmailQueueProcessor {
  private isProcessing = false;
  private isSending = false;
  private intervalId: NodeJS.Timeout | null = null;
  private sendingIntervalId: NodeJS.Timeout | null = null;
  private processingCampaigns = new Set<number>();

  /**
   * Check if current time is within autopilot time window
   */
  private isWithinAutopilotWindow(campaign: any): boolean {
    // If autopilot is not enabled, always allow sending
    if (!campaign.autopilotEnabled) {
      return true;
    }

    // If no autopilot settings, allow sending (backward compatibility)
    if (!campaign.autopilotSettings || !campaign.autopilotSettings.days) {
      return true;
    }

    const now = new Date();
    const timezone = campaign.timezone || 'America/New_York';
    
    // Convert current time to campaign timezone
    // Using toLocaleString to get the time in the campaign's timezone
    const campaignTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[campaignTime.getDay()];
    const currentHour = campaignTime.getHours();
    const currentMinute = campaignTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Check if today is enabled
    const daySettings = campaign.autopilotSettings.days[currentDay];
    if (!daySettings || !daySettings.enabled) {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Autopilot not enabled for ${currentDay}`);
      return false;
    }

    // Parse start and end times
    const [startHour, startMinute] = daySettings.startTime.split(':').map(Number);
    const [endHour, endMinute] = daySettings.endTime.split(':').map(Number);
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;

    // Check if current time is within window
    const withinWindow = currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
    
    if (!withinWindow) {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Outside autopilot window for ${currentDay} (${daySettings.startTime}-${daySettings.endTime})`);
    }
    
    return withinWindow;
  }

  /**
   * Check if campaign has reached daily email limit
   */
  private async hasReachedDailyLimit(campaign: any): Promise<boolean> {
    // If autopilot is not enabled, no daily limit
    if (!campaign.autopilotEnabled) {
      return false;
    }

    // If no max emails per day set, no limit
    if (!campaign.maxEmailsPerDay || campaign.maxEmailsPerDay <= 0) {
      return false;
    }

    const timezone = campaign.timezone || 'America/New_York';
    const now = new Date();
    
    // Get start of day in campaign timezone
    const campaignTime = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    const startOfDay = new Date(campaignTime);
    startOfDay.setHours(0, 0, 0, 0);
    
    // Convert back to UTC for database query
    const utcStartOfDay = new Date(startOfDay.toLocaleString("en-US") + " " + timezone);

    // Count emails sent today for this campaign
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(campaignRecipients)
      .where(
        and(
          eq(campaignRecipients.campaignId, campaign.id),
          eq(campaignRecipients.status, 'sent'),
          sql`${campaignRecipients.updatedAt} >= ${utcStartOfDay}`
        )
      );

    const sentToday = result?.count || 0;
    const hasReachedLimit = sentToday >= campaign.maxEmailsPerDay;
    
    if (hasReachedLimit) {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Daily limit reached (${sentToday}/${campaign.maxEmailsPerDay})`);
    } else {
      console.log(`[EmailQueueProcessor] Campaign ${campaign.id}: Daily progress (${sentToday}/${campaign.maxEmailsPerDay})`);
    }
    
    return hasReachedLimit;
  }

  /**
   * Start the queue processor
   */
  start(): void {
    if (this.intervalId) {
      console.log("[EmailQueueProcessor] Already running");
      return;
    }

    console.log("[EmailQueueProcessor] Starting email queue processor");
    
    // Start generation processor
    this.intervalId = setInterval(() => {
      this.processNextBatch().catch(error => {
        console.error("[EmailQueueProcessor] Error processing batch:", error);
      });
    }, PROCESSING_INTERVAL);

    // Start sending processor
    this.sendingIntervalId = setInterval(() => {
      this.processScheduledEmails().catch(error => {
        console.error("[EmailQueueProcessor] Error sending emails:", error);
      });
    }, SENDING_INTERVAL);

    // Process immediately on start
    this.processNextBatch();
    this.processScheduledEmails();
  }

  /**
   * Stop the queue processor
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.sendingIntervalId) {
      clearInterval(this.sendingIntervalId);
      this.sendingIntervalId = null;
    }
    console.log("[EmailQueueProcessor] Stopped");
  }

  /**
   * Process the next batch of queued recipients
   */
  async processNextBatch(): Promise<void> {
    if (this.isProcessing) {
      console.log("[EmailQueueProcessor] Already processing, skipping this cycle");
      return;
    }

    this.isProcessing = true;
    
    try {
      // Find campaigns with queued recipients
      const campaignsWithQueued = await db
        .select({
          campaignId: campaignRecipients.campaignId,
          count: sql<number>`count(*)::int`
        })
        .from(campaignRecipients)
        .where(eq(campaignRecipients.status, 'queued'))
        .groupBy(campaignRecipients.campaignId)
        .limit(1);

      if (campaignsWithQueued.length === 0) {
        console.log("[EmailQueueProcessor] No queued recipients found");
        return;
      }

      const campaignToProcess = campaignsWithQueued[0];
      
      // Skip if already processing this campaign
      if (this.processingCampaigns.has(campaignToProcess.campaignId)) {
        console.log(`[EmailQueueProcessor] Campaign ${campaignToProcess.campaignId} already being processed`);
        return;
      }

      console.log(`[EmailQueueProcessor] Processing campaign ${campaignToProcess.campaignId} with ${campaignToProcess.count} queued recipients`);
      this.processingCampaigns.add(campaignToProcess.campaignId);

      try {
        // Get the campaign details
        const [campaign] = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, campaignToProcess.campaignId))
          .limit(1);

        if (!campaign) {
          console.error(`[EmailQueueProcessor] Campaign ${campaignToProcess.campaignId} not found`);
          return;
        }

        // Get next batch of queued recipients
        const recipients = await db
          .select()
          .from(campaignRecipients)
          .where(
            and(
              eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
              eq(campaignRecipients.status, 'queued')
            )
          )
          .limit(BATCH_SIZE);

        if (recipients.length === 0) {
          console.log(`[EmailQueueProcessor] No recipients to process for campaign ${campaignToProcess.campaignId}`);
          return;
        }

        console.log(`[EmailQueueProcessor] Processing batch of ${recipients.length} recipients`);

        // Mark recipients as generating
        const recipientIds = recipients.map(r => r.id);
        await db
          .update(campaignRecipients)
          .set({ 
            status: 'generating',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
              inArray(campaignRecipients.id, recipientIds)
            )
          );

        // Process each recipient
        const results = await Promise.allSettled(
          recipients.map(recipient => this.generateEmailForRecipient(campaign, recipient))
        );

        // Update statuses based on results
        const successful: number[] = [];
        const failed: number[] = [];

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successful.push(recipients[index].id);
          } else {
            failed.push(recipients[index].id);
            console.error(`[EmailQueueProcessor] Failed to generate email for recipient ${recipients[index].id}:`, result.reason);
          }
        });

        // Update successful recipients based on human review requirement
        if (successful.length > 0) {
          // Check if campaign requires human review
          const targetStatus = campaign.requiresHumanReview ? 'in_review' : 'scheduled';
          
          await db
            .update(campaignRecipients)
            .set({ 
              status: targetStatus,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
                inArray(campaignRecipients.id, successful)
              )
            );
          console.log(`[EmailQueueProcessor] Generated emails for ${successful.length} recipients (status: ${targetStatus})`);
        }

        // Update failed recipients
        if (failed.length > 0) {
          await db
            .update(campaignRecipients)
            .set({ 
              status: 'failed_generation',
              errorMessage: 'Email generation failed',
              updatedAt: new Date()
            })
            .where(
              and(
                eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
                inArray(campaignRecipients.id, failed)
              )
            );
          console.log(`[EmailQueueProcessor] Failed to generate emails for ${failed.length} recipients`);
        }

      } finally {
        this.processingCampaigns.delete(campaignToProcess.campaignId);
      }

    } catch (error) {
      console.error("[EmailQueueProcessor] Error in processNextBatch:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Generate email content for a single recipient
   */
  private async generateEmailForRecipient(
    campaign: Campaign,
    recipient: CampaignRecipient
  ): Promise<void> {
    try {
      let emailContent: string;
      let emailSubject: string;

      // Check if campaign uses AI mode or template mode
      if (campaign.generationType === 'ai' && campaign.prompt) {
        // AI mode: generate content using the prompt with merge fields
        const mergeFields = {
          first_name: recipient.recipientFirstName || '',
          last_name: recipient.recipientLastName || '',
          contact_company_name: recipient.recipientCompany || '',
          contact_email: recipient.recipientEmail
        };

        const generated = await generateEmailContent({
          prompt: campaign.prompt,
          mergeFields,
          campaignName: campaign.name
        });

        emailContent = generated.body;
        emailSubject = generated.subject;

      } else {
        // Template mode: use the campaign's template with merge field replacement
        emailContent = this.replaceMergeFields(
          campaign.body || '',
          {
            first_name: recipient.recipientFirstName || '',
            last_name: recipient.recipientLastName || '',
            contact_company_name: recipient.recipientCompany || '',
            contact_email: recipient.recipientEmail
          }
        );

        emailSubject = this.replaceMergeFields(
          campaign.subject || '',
          {
            first_name: recipient.recipientFirstName || '',
            last_name: recipient.recipientLastName || '',
            contact_company_name: recipient.recipientCompany || '',
            contact_email: recipient.recipientEmail
          }
        );
      }

      // Save generated content to recipient record
      await db
        .update(campaignRecipients)
        .set({
          emailContent,
          emailSubject,
          updatedAt: new Date()
        })
        .where(eq(campaignRecipients.id, recipient.id));

    } catch (error) {
      console.error(`[EmailQueueProcessor] Error generating email for recipient ${recipient.id}:`, error);
      throw error;
    }
  }

  /**
   * Replace merge fields in template content
   */
  private replaceMergeFields(template: string, fields: Record<string, string>): string {
    let result = template;
    
    // Replace {{field_name}} patterns
    Object.entries(fields).forEach(([key, value]) => {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      result = result.replace(pattern, value);
    });

    return result;
  }

  /**
   * Approve a batch of emails for sending
   */
  async approveBatch(campaignId: number, recipientIds: number[]): Promise<void> {
    await db
      .update(campaignRecipients)
      .set({
        status: 'scheduled',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, 'in_review'),
          inArray(campaignRecipients.id, recipientIds)
        )
      );

    console.log(`[EmailQueueProcessor] Approved ${recipientIds.length} emails for sending`);
  }

  /**
   * Reject a batch of emails (mark for regeneration)
   */
  async rejectBatch(campaignId: number, recipientIds: number[]): Promise<void> {
    await db
      .update(campaignRecipients)
      .set({
        status: 'queued', // Back to queue for regeneration
        emailContent: null,
        emailSubject: null,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(campaignRecipients.campaignId, campaignId),
          eq(campaignRecipients.status, 'in_review'),
          inArray(campaignRecipients.id, recipientIds)
        )
      );

    console.log(`[EmailQueueProcessor] Rejected ${recipientIds.length} emails for regeneration`);
  }

  /**
   * Process scheduled emails for sending
   */
  async processScheduledEmails(): Promise<void> {
    if (this.isSending) {
      return;
    }

    this.isSending = true;

    try {
      // Find scheduled recipients ready to send - now includes autopilot settings
      const scheduledRecipients = await db
        .select({
          id: campaignRecipients.id,
          campaignId: campaignRecipients.campaignId,
          contactId: campaignRecipients.contactId, // Added for communication history tracking
          userId: campaigns.userId,
          senderProfileId: campaigns.senderProfileId,
          recipientEmail: campaignRecipients.recipientEmail,
          recipientFirstName: campaignRecipients.recipientFirstName,
          recipientLastName: campaignRecipients.recipientLastName,
          recipientCompany: campaignRecipients.recipientCompany,
          emailSubject: campaignRecipients.emailSubject,
          emailContent: campaignRecipients.emailContent,
          delayBetweenEmails: campaigns.delayBetweenEmails,
          // Add autopilot settings
          autopilotEnabled: campaigns.autopilotEnabled,
          autopilotSettings: campaigns.autopilotSettings,
          maxEmailsPerDay: campaigns.maxEmailsPerDay,
          timezone: campaigns.timezone,
        })
        .from(campaignRecipients)
        .innerJoin(campaigns, eq(campaignRecipients.campaignId, campaigns.id))
        .where(
          and(
            eq(campaignRecipients.status, 'scheduled'),
            eq(campaigns.status, 'active')
          )
        )
        .limit(10); // Send up to 10 at a time

      if (scheduledRecipients.length === 0) {
        return;
      }

      console.log(`[EmailQueueProcessor] Processing ${scheduledRecipients.length} scheduled emails`);

      // Group recipients by user to check their Gmail auth status
      const recipientsByUser = scheduledRecipients.reduce((acc, recipient) => {
        if (!acc[recipient.userId]) {
          acc[recipient.userId] = [];
        }
        acc[recipient.userId].push(recipient);
        return acc;
      }, {} as Record<number, typeof scheduledRecipients>);

      // Process each user's recipients
      for (const [userId, allUserRecipients] of Object.entries(recipientsByUser)) {
        const userIdNum = parseInt(userId);
        
        // Check if user has Gmail connected
        const hasGmailAuth = await TokenService.hasValidGmailAuth(userIdNum);
        
        if (!hasGmailAuth) {
          console.log(`[EmailQueueProcessor] User ${userIdNum} doesn't have Gmail connected, marking emails for manual send`);
          
          // Mark these emails as requiring manual send
          await db
            .update(campaignRecipients)
            .set({
              status: 'manual_send_required',
              errorMessage: 'Gmail not connected - manual send required',
              updatedAt: new Date()
            })
            .where(
              inArray(campaignRecipients.id, allUserRecipients.map(r => r.id))
            );
          
          continue;
        }

        // Group recipients by campaign to check autopilot settings per campaign
        const recipientsByCampaign = allUserRecipients.reduce((acc, recipient) => {
          if (!acc[recipient.campaignId]) {
            acc[recipient.campaignId] = [];
          }
          acc[recipient.campaignId].push(recipient);
          return acc;
        }, {} as Record<number, typeof allUserRecipients>);

        // Process each campaign's recipients separately
        for (const [campaignId, userRecipients] of Object.entries(recipientsByCampaign)) {
          const campaignIdNum = parseInt(campaignId);
          const firstRecipient = userRecipients[0];
          
          // Create a campaign object with the autopilot settings
          const campaignSettings = {
            id: campaignIdNum,
            autopilotEnabled: firstRecipient.autopilotEnabled,
            autopilotSettings: firstRecipient.autopilotSettings,
            maxEmailsPerDay: firstRecipient.maxEmailsPerDay,
            timezone: firstRecipient.timezone
          };

          // Check if we're within autopilot time window
          if (!this.isWithinAutopilotWindow(campaignSettings)) {
            console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum}: Outside autopilot window, skipping batch`);
            continue; // Skip this campaign's recipients for now
          }

          // Check if we've reached daily email limit
          if (await this.hasReachedDailyLimit(campaignSettings)) {
            console.log(`[EmailQueueProcessor] Campaign ${campaignIdNum}: Daily limit reached, skipping batch`);
            continue; // Skip this campaign's recipients for now
          }

          // Continue with the existing processing logic for this campaign's recipients
          
          // Get user info for sending
          const user = await storage.getUserById(userIdNum);
          if (!user) {
            console.error(`[EmailQueueProcessor] User ${userIdNum} not found`);
            continue;
          }

          // Get the sender profile for the campaign (if specified)
          let senderProfile = null;
          const campaignSenderProfileId = userRecipients[0].senderProfileId; // All recipients in this group have same campaign
          
          if (campaignSenderProfileId) {
            senderProfile = await storage.getSenderProfile(campaignSenderProfileId, userIdNum);
            if (!senderProfile) {
              console.warn(`[EmailQueueProcessor] Sender profile ${campaignSenderProfileId} not found, using default`);
            }
          }
          
          // If no sender profile, try to get the default one for the user
          if (!senderProfile) {
            const userProfiles = await storage.listSenderProfiles(userIdNum);
            senderProfile = userProfiles.find(p => p.isDefault) || userProfiles[0];
          }
          
          // Process each email for this user SEQUENTIALLY with delays
          const results: Array<{ success: boolean; recipientId?: number; error?: any }> = [];
          
          // Get delay setting (default to 30 seconds if not set, convert minutes to milliseconds)
          const delayBetweenEmails = (userRecipients[0].delayBetweenEmails || 0.5) * 60 * 1000;
          console.log(`[EmailQueueProcessor] Using delay of ${delayBetweenEmails / 1000} seconds between emails`);
        
          for (let i = 0; i < userRecipients.length; i++) {
            const recipient = userRecipients[i];
            
            // Add delay between emails (except for the first one)
            if (i > 0 && delayBetweenEmails > 0) {
              console.log(`[EmailQueueProcessor] Waiting ${delayBetweenEmails / 1000} seconds before sending next email...`);
              await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
            }
          
            try {
              // Build merge context for this recipient
              const recipientData = {
              email: recipient.recipientEmail,
              firstName: recipient.recipientFirstName || undefined,
              lastName: recipient.recipientLastName || undefined,
              name: `${recipient.recipientFirstName || ''} ${recipient.recipientLastName || ''}`.trim() || undefined,
              company: recipient.recipientCompany || undefined,
              title: undefined // Not available in current schema
            };
            
            // Use sender profile data or fall back to user data
            let senderData;
            if (senderProfile) {
              // Parse the display name to get first and last name
              const senderNameParts = senderProfile.displayName?.split(' ') || [];
              senderData = {
                email: senderProfile.email,
                firstName: senderNameParts[0] || undefined,
                lastName: senderNameParts.slice(1).join(' ') || undefined,
                name: senderProfile.displayName || undefined,
                company: senderProfile.companyName || undefined
              };
            } else {
              // Fallback to parsing username if no sender profile
              const senderNameParts = user.username?.split(' ') || [];
              senderData = {
                email: user.email,
                firstName: senderNameParts[0] || undefined,
                lastName: senderNameParts.slice(1).join(' ') || undefined,
                name: user.username || undefined,
                company: undefined // No default company
              };
            }
            
            // Build the merge context
            const mergeContext = buildMergeContext(recipientData, senderData);
            
            // Resolve merge fields in both subject and content
            const resolvedSubject = resolveAllMergeFields(
              recipient.emailSubject || 'No subject',
              mergeContext
            );
            const resolvedContent = resolveAllMergeFields(
              recipient.emailContent || 'No content',
              mergeContext
            );
            
            console.log(`[EmailQueueProcessor] Sending email ${i + 1}/${userRecipients.length} to ${recipient.recipientEmail}`);
            
            // Send email via Gmail with resolved content and custom sender name
            const gmailResult = await GmailOAuthService.sendEmail(
              userIdNum,
              user.email,
              recipient.recipientEmail,
              resolvedSubject,
              resolvedContent,
              senderProfile?.displayName  // Pass custom sender display name if available
            );

            // Track sent email in communication history (essential fields only)
            // This prevents duplicate sends and maintains audit trail
            if (recipient.contactId) {
              // Get company ID from contact
              const contact = await db.query.contacts.findFirst({
                where: eq(contacts.id, recipient.contactId),
                columns: { companyId: true }
              });
              
              if (contact?.companyId) {
                await db.insert(communicationHistory).values({
                  userId: userIdNum,
                  contactId: recipient.contactId,
                  companyId: contact.companyId,
                  campaignId: recipient.campaignId,
                  channel: 'email',
                  direction: 'outbound',
                  status: 'sent',
                  subject: resolvedSubject,
                  content: 'Campaign email sent', // Minimal content for tracking
                  sentAt: new Date(),
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }

            // Update status to sent
            await db
              .update(campaignRecipients)
              .set({
                status: 'sent',
                sentAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaignRecipients.id, recipient.id));

            console.log(`[EmailQueueProcessor] Successfully sent email to ${recipient.recipientEmail}`);
            results.push({ success: true, recipientId: recipient.id });
            
            } catch (error: any) {
              console.error(`[EmailQueueProcessor] Failed to send email to ${recipient.recipientEmail}:`, error);
              
              // Check if it's an auth error
              if (error.status === 401) {
                // Mark as manual send required
                await db
                  .update(campaignRecipients)
                  .set({
                    status: 'manual_send_required',
                    errorMessage: 'Gmail authentication expired - manual send required',
                    updatedAt: new Date()
                  })
                  .where(eq(campaignRecipients.id, recipient.id));
              } else {
                // Update status to failed_send
                await db
                  .update(campaignRecipients)
                  .set({
                    status: 'failed_send',
                    errorMessage: error instanceof Error ? error.message : 'Send failed',
                    updatedAt: new Date()
                  })
                  .where(eq(campaignRecipients.id, recipient.id));
              }
              
              results.push({ success: false, recipientId: recipient.id, error });
            }
          }

          // Log results for this campaign
          const successful = results.filter(r => r.success).length;
          const failed = results.filter(r => !r.success).length;
          
          if (successful > 0) {
            console.log(`[EmailQueueProcessor] Successfully sent ${successful} emails for user ${userIdNum}`);
          }
          if (failed > 0) {
            console.log(`[EmailQueueProcessor] Failed to send ${failed} emails for user ${userIdNum}`);
          }
        }
      }

    } catch (error) {
      console.error("[EmailQueueProcessor] Error in processScheduledEmails:", error);
    } finally {
      this.isSending = false;
    }
  }
}

// Create singleton instance
export const emailQueueProcessor = new EmailQueueProcessor();