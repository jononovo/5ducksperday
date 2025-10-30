import { db } from '../../../db';
import { 
  campaigns, 
  emailTemplates, 
  contactListMembers, 
  contacts, 
  companies,
  communicationHistory,
  users 
} from '@shared/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import sgMail from '@sendgrid/mail';
import { resolveAllMergeFields } from '../../../lib/merge-field-resolver.js';

export class AutoSendCampaignService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Process campaigns that don't require human review
   * This will be called by the scheduler to automatically send template-based emails
   */
  async processAutoSendCampaigns() {
    try {
      console.log('[AutoSendCampaign] Starting auto-send campaign processing');
      
      // Find all active campaigns that don't require human review and have a template
      const autoSendCampaigns = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.status, 'active'),
            eq(campaigns.requiresHumanReview, false),
            sql`${campaigns.emailTemplateId} IS NOT NULL`
          )
        );
      
      console.log(`[AutoSendCampaign] Found ${autoSendCampaigns.length} auto-send campaigns`);
      
      for (const campaign of autoSendCampaigns) {
        await this.processCampaign(campaign);
      }
      
    } catch (error) {
      console.error('[AutoSendCampaign] Error processing auto-send campaigns:', error);
      throw error;
    }
  }

  /**
   * Process a single campaign - send emails based on daily limits and scheduling
   */
  async processCampaign(campaign: any) {
    try {
      console.log(`[AutoSendCampaign] Processing campaign ${campaign.id}: ${campaign.name}`);
      
      // Get the email template
      if (!campaign.emailTemplateId) {
        console.error(`[AutoSendCampaign] Campaign ${campaign.id} has no template`);
        return;
      }
      
      const [template] = await db
        .select()
        .from(emailTemplates)
        .where(eq(emailTemplates.id, campaign.emailTemplateId));
      
      if (!template) {
        console.error(`[AutoSendCampaign] Template ${campaign.emailTemplateId} not found`);
        return;
      }
      
      // Get user details
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, campaign.userId));
      
      if (!user) {
        console.error(`[AutoSendCampaign] User ${campaign.userId} not found`);
        return;
      }
      
      // Get today's email count for this campaign
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(communicationHistory)
        .where(
          and(
            eq(communicationHistory.userId, campaign.userId),
            eq(communicationHistory.campaignId, campaign.id),
            sql`${communicationHistory.sentAt} >= ${todayStart}`
          )
        );
      
      const sentToday = countResult?.count || 0;
      const maxPerDay = campaign.maxEmailsPerDay || 20;
      const remainingToday = Math.max(0, maxPerDay - sentToday);
      
      if (remainingToday === 0) {
        console.log(`[AutoSendCampaign] Campaign ${campaign.id} reached daily limit (${maxPerDay})`);
        return;
      }
      
      console.log(`[AutoSendCampaign] Campaign ${campaign.id}: ${sentToday}/${maxPerDay} sent today, sending up to ${remainingToday} more`);
      
      // Get contacts from the campaign's list who haven't been contacted yet
      const uncontactedRecipients = await this.getUncontactedRecipients(
        campaign.contactListId,
        campaign.userId,
        campaign.id,
        remainingToday
      );
      
      console.log(`[AutoSendCampaign] Found ${uncontactedRecipients.length} uncontacted recipients`);
      
      // Send emails with spacing based on campaign settings
      const delayBetweenEmails = (campaign.delayBetweenEmails || 30) * 1000; // Convert to milliseconds
      
      for (let i = 0; i < uncontactedRecipients.length; i++) {
        const recipient = uncontactedRecipients[i];
        
        // Add delay between emails (except for the first one)
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
        }
        
        await this.sendTemplateEmail(
          template,
          recipient.contact,
          recipient.company,
          user,
          campaign
        );
      }
      
      console.log(`[AutoSendCampaign] Sent ${uncontactedRecipients.length} emails for campaign ${campaign.id}`);
      
    } catch (error) {
      console.error(`[AutoSendCampaign] Error processing campaign ${campaign.id}:`, error);
    }
  }

  /**
   * Get uncontacted recipients from a campaign's list
   */
  async getUncontactedRecipients(
    listId: number,
    userId: number,
    campaignId: number,
    limit: number
  ) {
    // Get contacts from the list who haven't been contacted in this campaign
    const recipients = await db
      .select({
        contact: contacts,
        company: companies
      })
      .from(contactListMembers)
      .innerJoin(contacts, eq(contacts.id, contactListMembers.contactId))
      .innerJoin(companies, eq(companies.id, contacts.companyId))
      .leftJoin(
        communicationHistory,
        and(
          eq(communicationHistory.contactId, contacts.id),
          eq(communicationHistory.campaignId, campaignId)
        )
      )
      .where(
        and(
          eq(contactListMembers.listId, listId),
          sql`${communicationHistory.id} IS NULL`, // No communication for this campaign
          sql`${contacts.email} IS NOT NULL AND ${contacts.email} != ''`
        )
      )
      .limit(limit);
    
    return recipients;
  }

  /**
   * Send a template-based email with merge fields resolved
   */
  async sendTemplateEmail(
    template: any,
    contact: any,
    company: any,
    user: any,
    campaign: any
  ) {
    try {
      // Prepare merge field context
      const mergeContext = {
        contact,
        company,
        user,
        senderNames: {
          fullName: user.username || 'Your Name',
          firstName: user.username?.split(' ')[0] || 'Your'
        }
      };
      
      // Resolve merge fields in subject and body
      const resolvedSubject = resolveAllMergeFields(template.subject || '', mergeContext);
      const resolvedBody = resolveAllMergeFields(template.body || '', mergeContext);
      
      // Send via SendGrid
      const msg = {
        to: contact.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'outreach@5ducks.com',
          name: user.username || '5Ducks'
        },
        subject: resolvedSubject,
        html: resolvedBody,
        text: resolvedBody.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        trackingSettings: {
          clickTracking: { enable: campaign.trackEmails || true },
          openTracking: { enable: campaign.trackEmails || true }
        },
        customArgs: {
          campaignId: campaign.id.toString(),
          contactId: contact.id.toString(),
          userId: user.id.toString()
        }
      };
      
      if (campaign.unsubscribeLink) {
        // Add unsubscribe link if enabled
        msg.html += `<br><br><p style="font-size: 12px; color: #666;">
          <a href="${process.env.APP_URL || 'https://app.5ducks.com'}/unsubscribe?token=${Buffer.from(`${contact.id}:${campaign.id}`).toString('base64')}">
            Unsubscribe from these emails
          </a>
        </p>`;
      }
      
      await sgMail.send(msg);
      
      // Record in communication history
      await db.insert(communicationHistory).values({
        userId: user.id,
        contactId: contact.id,
        companyId: company.id,
        channel: 'email',
        direction: 'outbound',
        subject: resolvedSubject,
        content: resolvedBody,
        status: 'sent',
        sentAt: new Date(),
        campaignId: campaign.id,
        templateId: template.id,
        metadata: {
          from: msg.from.email,
          to: contact.email,
          campaignName: campaign.name,
          templateName: template.name
        }
      });
      
      // Update contact status
      await db
        .update(contacts)
        .set({
          contactStatus: 'contacted',
          totalCommunications: sql`COALESCE(${contacts.totalCommunications}, 0) + 1`,
          lastContactedAt: new Date()
        })
        .where(eq(contacts.id, contact.id));
      
      console.log(`[AutoSendCampaign] Email sent to ${contact.email} for campaign ${campaign.name}`);
      
    } catch (error) {
      console.error(`[AutoSendCampaign] Error sending email to ${contact.email}:`, error);
      
      // Record the error in communication history
      await db.insert(communicationHistory).values({
        userId: user.id,
        contactId: contact.id,
        companyId: company.id,
        channel: 'email',
        direction: 'outbound',
        subject: template.subject,
        content: template.body,
        status: 'failed',
        campaignId: campaign.id,
        templateId: template.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          from: process.env.SENDGRID_FROM_EMAIL || 'outreach@5ducks.com',
          to: contact.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
}

export const autoSendCampaignService = new AutoSendCampaignService();