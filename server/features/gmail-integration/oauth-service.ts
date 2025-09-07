import { google } from 'googleapis';
import { TokenService } from '../billing/tokens/service';
import { GmailUserInfo } from './types';

export class GmailOAuthService {
  private static getOAuth2Client(redirectUri?: string) {
    return new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      redirectUri
    );
  }

  static generateAuthUrl(userId: string, host: string, protocol: string): string {
    const redirectUri = `${protocol}://${host}/api/gmail/callback`;
    const oauth2Client = this.getOAuth2Client(redirectUri);
    
    const scopes = [
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];
    
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId
    });
  }

  static async exchangeCodeForTokens(
    code: string, 
    host: string, 
    protocol: string
  ): Promise<{ tokens: any; oauth2Client: any }> {
    const redirectUri = `${protocol}://${host}/api/gmail/callback`;
    const oauth2Client = this.getOAuth2Client(redirectUri);
    
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    return { tokens, oauth2Client };
  }

  static async fetchUserInfo(accessToken: string): Promise<GmailUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }
    
    return response.json();
  }

  static async storeTokens(
    userId: number, 
    tokens: any, 
    userInfo: GmailUserInfo
  ): Promise<void> {
    await TokenService.storeGmailTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date
    }, {
      email: userInfo.email,
      name: userInfo.name
    });
  }

  static async checkAuthStatus(userId: number): Promise<boolean> {
    return TokenService.hasValidGmailAuth(userId);
  }

  static async disconnectGmail(userId: number): Promise<void> {
    await TokenService.deleteUserTokens(userId);
  }

  static async sendEmail(
    userId: number,
    userEmail: string,
    to: string,
    subject: string,
    content: string
  ): Promise<void> {
    const gmailToken = await TokenService.getGmailAccessToken(userId);
    
    if (!gmailToken) {
      const userTokens = await TokenService.getUserTokens(userId);
      const hasRefreshToken = !!userTokens?.gmailRefreshToken;
      
      throw {
        status: 401,
        message: "Gmail authorization required",
        hasRefreshToken,
        requiresReauth: !hasRefreshToken,
        action: hasRefreshToken ? "token_refresh_failed" : "no_gmail_connection"
      };
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: gmailToken });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const gmailUserInfo = await TokenService.getGmailUserInfo(userId);
    const senderEmail = gmailUserInfo?.email || userEmail;

    const fromHeader = gmailUserInfo?.displayName 
      ? `From: ${gmailUserInfo.displayName} <${senderEmail}>`
      : `From: ${senderEmail}`;

    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      fromHeader,
      'To: ' + to,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      content,
    ];
    const message = messageParts.join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
  }
}