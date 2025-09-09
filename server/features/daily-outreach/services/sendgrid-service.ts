import { MailService } from '@sendgrid/mail';
import { DailyBatch, EmailNotificationContent } from '../types';
import { User } from '@shared/schema';

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
      ? this.buildContactsReadyEmail(batch)
      : this.buildNeedMoreContactsEmail(user);
    
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
    } catch (error) {
      console.error('SendGrid email error:', error);
      return false;
    }
  }

  buildContactsReadyEmail(batch: DailyBatch): EmailNotificationContent {
    const secureUrl = `${this.appUrl}/outreach/daily/${batch.secureToken}`;
    
    const companiesBreakdown = batch.companiesByType
      .map(c => `<li>${c.count} ${c.type}</li>`)
      .join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { color: #333; margin-bottom: 20px; }
          .button { 
            display: inline-block; 
            background: #0066FF; 
            color: white !important; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 24px 0;
            font-weight: 500;
          }
          .list { margin: 16px 0; padding-left: 20px; }
          .footer { color: #666; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="header">Your 5 leads for today are ready</h2>
          
          <p>Hi there,</p>
          
          <p>Your personalized outreach emails are waiting:</p>
          
          <ul class="list">
            ${companiesBreakdown || '<li>5 carefully selected prospects</li>'}
          </ul>
          
          <a href="${secureUrl}" class="button">Review and Send Emails →</a>
          
          <p class="footer">
            <strong>Pro tip:</strong> Send these before noon for 23% higher response rates.<br><br>
            This link expires in 24 hours for security.
          </p>
        </div>
      </body>
      </html>
    `;
    
    const text = `Your 5 leads for today are ready

Hi there,

Your personalized outreach emails are waiting.

Review and send them here: ${secureUrl}

Pro tip: Send these before noon for 23% higher response rates.

This link expires in 24 hours for security.`;
    
    return {
      subject: 'Your 5 leads for today are ready',
      html,
      text
    };
  }

  private buildNeedMoreContactsEmail(user: User): EmailNotificationContent {
    const searchUrl = `${this.appUrl}/search`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { color: #333; margin-bottom: 20px; }
          .button { 
            display: inline-block; 
            background: #0066FF; 
            color: white !important; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            margin: 24px 0;
            font-weight: 500;
          }
          .stats { 
            background: #f5f5f5; 
            padding: 16px; 
            border-radius: 8px; 
            margin: 20px 0;
          }
          .footer { color: #666; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2 class="header">Time to find new prospects</h2>
          
          <p>Hi ${user.username || 'there'},</p>
          
          <p>You're running low on contacts to reach out to. Let's fix that!</p>
          
          <div class="stats">
            <strong>📊 Quick tip:</strong><br>
            Search for 10-15 new companies to maintain a healthy pipeline.
            Each search typically yields 3-5 quality contacts per company.
          </div>
          
          <a href="${searchUrl}" class="button">Search for New Leads →</a>
          
          <p class="footer">
            <strong>Remember:</strong> Consistent outreach is the key to predictable sales.<br>
            Aim to add new prospects weekly to keep your pipeline full.
          </p>
        </div>
      </body>
      </html>
    `;
    
    const text = `Time to find new prospects

Hi ${user.username || 'there'},

You're running low on contacts to reach out to. Let's fix that!

Search for new leads here: ${searchUrl}

Quick tip: Search for 10-15 new companies to maintain a healthy pipeline.
Each search typically yields 3-5 quality contacts per company.

Remember: Consistent outreach is the key to predictable sales.
Aim to add new prospects weekly to keep your pipeline full.`;
    
    return {
      subject: 'Time to refill your sales pipeline',
      html,
      text
    };
  }
}

export const sendGridService = new SendGridNotificationService();