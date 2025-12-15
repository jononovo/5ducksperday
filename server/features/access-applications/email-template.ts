export interface ApplicationEmailContent {
  subject: string;
  html: string;
  text: string;
}

export function buildApplicationConfirmationEmail(name: string, appUrl: string): ApplicationEmailContent {
  const firstName = name.split(' ')[0];
  
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
        .emoji { font-size: 48px; text-align: center; margin: 30px 0; }
        .footer { color: #666; font-size: 14px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
        .highlight { background: #FEF3C7; padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="emoji">🐥</div>
        
        <h2 class="header">You're on the list, ${firstName}!</h2>
        
        <p>Thanks for applying for early access to 5Ducks!</p>
        
        <div class="highlight">
          <p style="margin: 0;"><strong>What happens next?</strong></p>
          <p style="margin: 10px 0 0 0;">We review applications regularly and will send you your access code as soon as a spot opens up.</p>
        </div>
        
        <p>In the meantime, keep an eye on your inbox — your code could arrive any day!</p>
        
        <p class="footer">
          Cheers,<br>
          <strong>Jon @ 5Ducks</strong><br>
          <span style="color: #999;">P.S. We're excited to have you join us soon! 🚀</span>
        </p>
      </div>
    </body>
    </html>
  `;
  
  const text = `You're on the list, ${firstName}! 🐥

Thanks for applying for early access to 5Ducks!

What happens next?
We review applications regularly and will send you your access code as soon as a spot opens up.

In the meantime, keep an eye on your inbox — your code could arrive any day!

Cheers,
Jon @ 5Ducks

P.S. We're excited to have you join us soon! 🚀`;
  
  return {
    subject: "You're on the list! 🐥",
    html,
    text
  };
}
