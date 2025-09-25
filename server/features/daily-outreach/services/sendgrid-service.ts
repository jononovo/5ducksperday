import { MailService } from '@sendgrid/mail';
import { DailyBatch, EmailNotificationContent } from '../types';
import { User } from '@shared/schema';
import { buildContactsReadyEmail } from '../email-templates/contacts-ready';
import { buildNeedMoreContactsEmail } from '../email-templates/need-more-contacts';

export class SendGridNotificationService {
  private sg: MailService;
  private fromEmail: string;
  private fromName: string;
  private appUrl: string;

  constructor() {
    this.sg = new MailService();
    
    if (process.env.SENDGRID_API_KEY) {
      this.sg.setApiKey(process.env.SENDGRID_API_KEY);
    }
    
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'quack@5ducks.ai';
    this.fromName = process.env.SENDGRID_FROM_NAME || '5Ducks Daily';
    this.appUrl = process.env.APP_URL || 'https://5ducks.ai';
  }

  async sendDailyNudgeEmail(user: User, batch: DailyBatch | null): Promise<boolean> {
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SendGrid API key not configured');
      return false;
    }

    const emailContent = batch 
      ? buildContactsReadyEmail(batch, this.appUrl)
      : buildNeedMoreContactsEmail(user, this.appUrl);
    
    try {
      await this.sg.send({
        to: user.email,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        trackingSettings: {
          clickTracking: { enable: true },
          openTracking: { enable: true }
        }
      });
      
      console.log(`Daily nudge email sent to ${user.email}`);
      return true;
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      if (error.response?.body) {
        console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      }
      return false;
    }
  }

  // Email template functions have been moved to email-templates folder
  // Use imported buildContactsReadyEmail and buildNeedMoreContactsEmail functions

}

export const sendGridService = new SendGridNotificationService();