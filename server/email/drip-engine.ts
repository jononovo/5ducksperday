import { storage } from '../storage';
import { sendEmail } from './send';
import { buildEmailFromTemplate, TemplateVariables } from './templates/index';
import { calculateScheduledTime } from './calendar';
import { db } from '../db';
import { emailSequences, emailSequenceEvents } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 3;

class DripEmailEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  async initialize() {
    console.log('[DripEngine] Initializing drip email engine...');
    
    await this.ensureAccessApplicationSequenceExists();
    
    this.startPolling();
    console.log('[DripEngine] Drip engine initialized and polling started');
  }

  private async ensureAccessApplicationSequenceExists() {
    const existingSequence = await storage.getEmailSequenceByName('Access Application Sequence');
    
    if (!existingSequence) {
      console.log('[DripEngine] Creating Access Application Sequence...');
      
      const [sequence] = await db.insert(emailSequences)
        .values({
          name: 'Access Application Sequence',
          description: 'Drip sequence for new access code applicants',
          isActive: true
        })
        .returning();
      
      await db.insert(emailSequenceEvents).values([
        {
          sequenceId: sequence.id,
          templateKey: 'access_confirmation',
          eventOrder: 1,
          delayHours: 0,
          delayType: 'hours',
          isActive: true
        },
        {
          sequenceId: sequence.id,
          templateKey: 'fast_track',
          eventOrder: 2,
          delayHours: 72,
          delayType: 'working_days',
          isActive: true
        },
        {
          sequenceId: sequence.id,
          templateKey: 'welcome_code',
          eventOrder: 3,
          delayHours: 48,
          delayType: 'hours',
          isActive: true
        }
      ]);
      
      console.log('[DripEngine] Access Application Sequence created with 3 events');
    } else {
      console.log('[DripEngine] Access Application Sequence already exists');
    }
  }

  startPolling() {
    if (this.intervalId) {
      console.log('[DripEngine] Polling already running');
      return;
    }

    console.log(`[DripEngine] Starting polling every ${POLL_INTERVAL_MS / 1000}s`);
    
    this.intervalId = setInterval(async () => {
      await this.processPendingEmails();
    }, POLL_INTERVAL_MS);

    this.processPendingEmails();
  }

  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[DripEngine] Polling stopped');
    }
  }

  async processPendingEmails() {
    if (this.isProcessing) {
      console.log('[DripEngine] Already processing, skipping cycle');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingEmails = await storage.getPendingEmailSends(20);
      
      if (pendingEmails.length === 0) {
        return;
      }

      console.log(`[DripEngine] Processing ${pendingEmails.length} pending emails`);

      for (const emailSend of pendingEmails) {
        await this.sendScheduledEmail(emailSend);
      }
    } catch (error) {
      console.error('[DripEngine] Error processing pending emails:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendScheduledEmail(emailSend: any) {
    try {
      const variables: TemplateVariables = {
        name: emailSend.recipientName || undefined,
        email: emailSend.recipientEmail,
        secretCode: 'QUACK',
        appUrl: process.env.APP_URL || 'https://5ducks.ai',
        ...(emailSend.metadata || {})
      };

      const content = buildEmailFromTemplate(emailSend.templateKey, variables);
      
      if (!content) {
        await storage.updateEmailSendStatus(emailSend.id, 'failed', `Template not found: ${emailSend.templateKey}`);
        return;
      }

      await sendEmail({
        to: emailSend.recipientEmail,
        content
      });

      await storage.markEmailSendAsSent(emailSend.id);
      console.log(`[DripEngine] Email sent: ${emailSend.templateKey} to ${emailSend.recipientEmail}`);
    } catch (error: any) {
      console.error(`[DripEngine] Failed to send email ${emailSend.id}:`, error);
      
      if (emailSend.retryCount >= MAX_RETRIES) {
        await storage.updateEmailSendStatus(emailSend.id, 'failed', error.message);
      } else {
        await storage.updateEmailSendStatus(emailSend.id, 'scheduled', error.message);
      }
    }
  }

  async sendImmediate(
    to: string,
    content: { subject: string; html: string; text?: string },
    fromName?: string
  ): Promise<boolean> {
    try {
      const result = await sendEmail({
        to,
        content: {
          subject: content.subject,
          html: content.html,
          text: content.text || ''
        },
        fromName
      });
      
      if (result) {
        console.log(`[DripEngine] Immediate email sent to ${to}: ${content.subject}`);
      } else {
        console.warn(`[DripEngine] Email send returned false for ${to} (SendGrid may not be configured)`);
      }
      
      return result;
    } catch (error: any) {
      console.error(`[DripEngine] Failed to send immediate email to ${to}:`, error);
      return false;
    }
  }

  async enrollInSequence(
    sequenceName: string,
    recipientEmail: string,
    recipientName?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const sequence = await storage.getEmailSequenceByName(sequenceName);
      
      if (!sequence) {
        console.error(`[DripEngine] Sequence not found: ${sequenceName}`);
        return false;
      }

      const events = await storage.getEmailSequenceEvents(sequence.id);
      
      if (events.length === 0) {
        console.error(`[DripEngine] No events in sequence: ${sequenceName}`);
        return false;
      }

      console.log(`[DripEngine] Enrolling ${recipientEmail} in ${sequenceName} (${events.length} events)`);

      let previousScheduledTime = new Date();

      for (const event of events) {
        const scheduledFor = event.eventOrder === 1
          ? new Date()
          : calculateScheduledTime(previousScheduledTime, event.delayHours, event.delayType as 'hours' | 'working_days');

        await storage.createEmailSend({
          recipientEmail: recipientEmail.toLowerCase(),
          recipientName,
          sequenceId: sequence.id,
          eventId: event.id,
          templateKey: event.templateKey,
          status: 'scheduled',
          scheduledFor,
          metadata: metadata || {}
        });

        previousScheduledTime = scheduledFor;
        
        console.log(`[DripEngine] Scheduled ${event.templateKey} for ${scheduledFor.toISOString()}`);
      }

      return true;
    } catch (error) {
      console.error('[DripEngine] Error enrolling in sequence:', error);
      return false;
    }
  }
}

export const dripEmailEngine = new DripEmailEngine();
