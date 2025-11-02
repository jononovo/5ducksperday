import { storage } from "../../storage";
import { db } from "../../db";
import { campaignRecipients, campaigns } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { generateEmailContent } from "../email-generation/generator";
import type { Campaign, CampaignRecipient } from "@shared/schema";
import sgMail from '@sendgrid/mail';

const BATCH_SIZE = 20; // Process 20 recipients at a time
const PROCESSING_INTERVAL = 10000; // Check every 10 seconds
const SENDING_INTERVAL = 5000; // Check for emails to send every 5 seconds

// Initialize SendGrid
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
              sql`${campaignRecipients.id} = ANY(${recipientIds})`
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

        // Update successful recipients to in_review
        if (successful.length > 0) {
          await db
            .update(campaignRecipients)
            .set({ 
              status: 'in_review',
              updatedAt: new Date()
            })
            .where(
              and(
                eq(campaignRecipients.campaignId, campaignToProcess.campaignId),
                sql`${campaignRecipients.id} = ANY(${successful})`
              )
            );
          console.log(`[EmailQueueProcessor] Generated emails for ${successful.length} recipients`);
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
                sql`${campaignRecipients.id} = ANY(${failed})`
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
          sql`${campaignRecipients.id} = ANY(${recipientIds})`
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
          sql`${campaignRecipients.id} = ANY(${recipientIds})`
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
      if (!process.env.SENDGRID_API_KEY) {
        console.log("[EmailQueueProcessor] SendGrid not configured, skipping email send");
        return;
      }

      // Find scheduled recipients ready to send
      const scheduledRecipients = await db
        .select({
          id: campaignRecipients.id,
          campaignId: campaignRecipients.campaignId,
          recipientEmail: campaignRecipients.recipientEmail,
          recipientFirstName: campaignRecipients.recipientFirstName,
          recipientLastName: campaignRecipients.recipientLastName,
          emailSubject: campaignRecipients.emailSubject,
          emailContent: campaignRecipients.emailContent,
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

      // Process each email
      const results = await Promise.allSettled(
        scheduledRecipients.map(async (recipient) => {
          try {
            // Send email via SendGrid
            await sgMail.send({
              to: recipient.recipientEmail,
              from: {
                email: process.env.SENDGRID_FROM_EMAIL || 'hello@yourdomain.com',
                name: process.env.SENDGRID_FROM_NAME || 'Your Company'
              },
              subject: recipient.emailSubject || 'No subject',
              html: recipient.emailContent || 'No content',
              trackingSettings: {
                clickTracking: { enable: true },
                openTracking: { enable: true }
              }
            });

            // Update status to sent
            await db
              .update(campaignRecipients)
              .set({
                status: 'sent',
                sentAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(campaignRecipients.id, recipient.id));

            console.log(`[EmailQueueProcessor] Sent email to ${recipient.recipientEmail}`);
            return { success: true, recipientId: recipient.id };
          } catch (error) {
            console.error(`[EmailQueueProcessor] Failed to send email to ${recipient.recipientEmail}:`, error);
            
            // Update status to failed_send
            await db
              .update(campaignRecipients)
              .set({
                status: 'failed_send',
                errorMessage: error instanceof Error ? error.message : 'Send failed',
                updatedAt: new Date()
              })
              .where(eq(campaignRecipients.id, recipient.id));
            
            throw error;
          }
        })
      );

      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        console.log(`[EmailQueueProcessor] Successfully sent ${successful} emails`);
      }
      if (failed > 0) {
        console.log(`[EmailQueueProcessor] Failed to send ${failed} emails`);
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