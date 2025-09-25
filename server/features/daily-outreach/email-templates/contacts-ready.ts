import { DailyBatch, EmailNotificationContent } from '../types';

export function buildContactsReadyEmail(batch: DailyBatch, appUrl: string): EmailNotificationContent {
  const secureUrl = `${appUrl}/outreach/daily/${batch.secureToken}`;
  
  const companiesBreakdown = batch.companiesByType
    ?.map(c => `<li>${c.count} ${c.type}</li>`)
    .join('') || '<li>5 carefully selected prospects</li>';
  
  // Build the contact list HTML - each contact is clickable and opens outreach page in new tab
  const contactsListHtml = batch.items && batch.items.length > 0 ? `
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 16px;">Your prospects for today:</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${batch.items.map((item, index) => `
          <li style="padding: 0; ${index < batch.items!.length - 1 ? 'border-bottom: 1px solid #e0e0e0;' : ''}">
            <a href="${secureUrl}" target="_blank" style="display: block; padding: 10px 0; text-decoration: none; color: inherit;">
              <strong style="color: #333;">${item.contact.name}</strong>
              <span style="color: #666;"> @ ${item.company.name}</span>
              ${item.contact.role ? `<br><small style="color: #888; font-size: 13px;">${item.contact.role}</small>` : ''}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : '';

  // Build the contact list text version
  const contactsListText = batch.items && batch.items.length > 0 
    ? `\nYour prospects for today:\n${batch.items.map(item => 
        `- ${item.contact.name} @ ${item.company.name}${item.contact.role ? ` (${item.contact.role})` : ''}`
      ).join('\n')}\n`
    : '';
  
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
        /* Hover effect for clickable contacts - works in email clients that support it */
        a:hover { background-color: #f0f0f0 !important; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="header">Your 5 leads for today are ready</h2>
        
        <p>Hi there,</p>
        
        <p>Your personalized outreach emails are waiting:</p>
        
        <ul class="list">
          ${companiesBreakdown}
        </ul>
        
        ${contactsListHtml}
        
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
${contactsListText}
Review and send them here: ${secureUrl}

Pro tip: Send these before noon for 23% higher response rates.

This link expires in 24 hours for security.`;
  
  return {
    subject: 'Your 5 leads for today are ready',
    html,
    text
  };
}