import { Router, Request, Response, Application } from 'express';
import { storage } from '../storage';
import { GmailOAuthService } from './oauth/service';
import { TokenService } from '../features/billing/tokens/service';
import type { 
  GmailAuthRequest, 
  GmailCallbackQuery, 
  SendGmailRequest,
  GmailStatusResponse,
  GmailDisconnectResponse,
  SendGmailResponse 
} from './oauth/types';

export function registerGmailRoutes(app: Application, requireAuth: any) {
  const router = Router();

  // OAuth flow routes
  router.get('/auth', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      
      if (!userId || !userId.match(/^\d+$/)) {
        return res.status(400).json({ error: 'Invalid user ID parameter' });
      }
      
      const user = await storage.getUserById(parseInt(userId));
      if (!user) {
        return res.status(400).json({ error: 'User not found' });
      }
      
      // Force HTTPS for OAuth callbacks - Replit always serves via HTTPS externally
      // even though internally the app sees HTTP
      const protocol = process.env.OAUTH_PROTOCOL || 
        (process.env.NODE_ENV === 'production' ? 'https' : 
          req.get('host')?.includes('replit.dev') ? 'https' : req.protocol);
      
      // Debug logging
      console.log('[Gmail OAuth] Generating auth URL with:', {
        host: req.get('host'),
        protocol,
        userId,
        NODE_ENV: process.env.NODE_ENV,
        OAUTH_PROTOCOL: process.env.OAUTH_PROTOCOL,
        reqProtocol: req.protocol,
        includesReplitDev: req.get('host')?.includes('replit.dev'),
        constructedRedirectUri: `${protocol}://${req.get('host')}/api/gmail/callback`
      });
      
      const authUrl = GmailOAuthService.generateAuthUrl(
        userId, 
        req.get('host')!, 
        protocol
      );
      
      console.log('[Gmail OAuth] Generated auth URL:', authUrl);
      
      res.redirect(authUrl);
    } catch (error) {
      console.error('Gmail OAuth error:', error);
      res.status(500).json({ error: 'Failed to start Gmail authorization' });
    }
  });

  router.get('/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query as unknown as GmailCallbackQuery;
      
      if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
      }
      
      const userId = parseInt(state, 10);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid state parameter' });
      }
      
      // Force HTTPS for OAuth callbacks - Replit always serves via HTTPS externally
      // even though internally the app sees HTTP
      const protocol = process.env.OAUTH_PROTOCOL || 
        (process.env.NODE_ENV === 'production' ? 'https' : 
          req.get('host')?.includes('replit.dev') ? 'https' : req.protocol);
      
      const { tokens } = await GmailOAuthService.exchangeCodeForTokens(
        code, 
        req.get('host')!, 
        protocol
      );
      
      const userInfo = await GmailOAuthService.fetchUserInfo(tokens.access_token);
      
      console.log(`[Gmail OAuth] Fetched userinfo for user ${userId}:`, {
        email: userInfo.email,
        name: userInfo.name,
        email_verified: userInfo.email_verified
      });
      
      await GmailOAuthService.storeTokens(userId, tokens, userInfo);
      
      // Create or update sender profile for this Gmail account
      try {
        const { storage } = await import('../storage');
        
        // Get existing profiles for this user
        const existingProfiles = await storage.listSenderProfiles(userId);
        
        // Check if a profile already exists with this Gmail email
        const existingGmailProfile = existingProfiles.find(p => p.email === userInfo.email);
        
        if (!existingGmailProfile) {
          // Parse the name from Gmail userInfo
          const nameParts = userInfo.name?.split(' ') || [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          const displayName = userInfo.name || userInfo.email.split('@')[0];
          
          // Create new sender profile with Gmail info
          const newProfile = await storage.createSenderProfile({
            userId,
            displayName,
            email: userInfo.email,
            isDefault: existingProfiles.length === 0, // Make default if it's the first profile
            companyName: undefined, // Can be updated later
            companyWebsite: undefined,
            title: undefined
          });
          
          console.log(`[Gmail OAuth] Created sender profile for Gmail account:`, {
            userId,
            email: userInfo.email,
            displayName,
            isDefault: existingProfiles.length === 0
          });
        } else {
          // Optionally update the existing profile with latest name from Gmail
          if (userInfo.name && existingGmailProfile.displayName !== userInfo.name) {
            await storage.updateSenderProfile(existingGmailProfile.id, {
              displayName: userInfo.name
            });
            console.log(`[Gmail OAuth] Updated sender profile display name for ${userInfo.email}`);
          }
        }
      } catch (error) {
        // Log but don't fail the OAuth flow if profile creation fails
        console.error('[Gmail OAuth] Failed to create/update sender profile:', error);
      }
      
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GMAIL_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/outreach';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error handling Gmail callback:', error);
      res.status(500).json({ error: 'Failed to complete Gmail authorization' });
    }
  });

  // Status and management routes
  router.get('/status', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      
      const hasValidAuth = await GmailOAuthService.checkAuthStatus(userId);
      
      const response: GmailStatusResponse = {
        connected: hasValidAuth,
        authUrl: hasValidAuth ? null : `/api/gmail/auth?userId=${userId}`
      };
      
      res.json(response);
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      res.status(500).json({ error: 'Failed to check Gmail connection status' });
    }
  });

  // Duplicate of /status - merge functionality
  router.get('/auth-status', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const hasValidAuth = await TokenService.hasValidGmailAuth(userId);
      
      console.log('Checking Gmail auth status:', {
        userId,
        hasValidAuth,
        timestamp: new Date().toISOString()
      });
      
      res.json({ 
        authorized: hasValidAuth,
        hasValidToken: hasValidAuth,
        connected: hasValidAuth
      });
    } catch (error) {
      console.error('Error checking Gmail auth status:', error);
      res.json({ 
        authorized: false,
        hasValidToken: false,
        connected: false
      });
    }
  });

  router.get('/disconnect', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      
      await GmailOAuthService.disconnectGmail(userId);
      delete (req.session as any).gmailRefreshToken;
      
      req.session.save(err => {
        if (err) {
          console.error('Error saving session:', err);
          return res.status(500).json({ error: 'Failed to disconnect Gmail' });
        }
        
        const response: GmailDisconnectResponse = {
          success: true,
          message: 'Gmail disconnected successfully'
        };
        
        res.json(response);
      });
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
  });

  // Get Gmail user info
  router.get('/user', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const userInfo = await TokenService.getGmailUserInfo(userId);
      
      console.log('Retrieved Gmail user info:', {
        userId,
        hasEmail: !!userInfo?.email,
        hasName: !!userInfo?.name,
        timestamp: new Date().toISOString()
      });
      
      res.json(userInfo);
    } catch (error) {
      console.error('Error retrieving Gmail user info:', error);
      res.status(500).json({ error: "Failed to retrieve Gmail user info" });
    }
  });

  app.use('/api/gmail', router);
  
  // Send email endpoint (outside of /api/gmail prefix for backward compatibility)
  app.post('/api/send-gmail', requireAuth, async (req: Request, res: Response) => {
    try {
      const { to, subject, content, contactId, companyId, tone, offerStrategy } = req.body as SendGmailRequest & {
        contactId?: number;
        companyId?: number;
        tone?: string;
        offerStrategy?: string;
      };

      if (!to || !subject || !content) {
        res.status(400).json({ message: "Missing required email fields" });
        return;
      }

      const userId = (req as any).user.id;
      const userEmail = (req as any).user.email;
      
      try {
        // Send email via Gmail API and get threadId/messageId
        const gmailResult = await GmailOAuthService.sendEmail(userId, userEmail, to, subject, content);
        
        // If contactId and companyId are provided, save to CRM communications history
        if (contactId && companyId) {
          const { db } = await import('../db');
          const { communicationHistory, contacts } = await import('@shared/schema');
          const { eq, sql } = await import('drizzle-orm');
          
          // Save to communication history
          await db.insert(communicationHistory).values({
            userId,
            contactId,
            companyId,
            channel: 'email',
            direction: 'outbound',
            subject,
            content,
            contentPreview: content.substring(0, 200),
            status: 'sent',
            sentAt: new Date(),
            threadId: gmailResult.threadId,
            metadata: {
              from: userEmail,
              to,
              messageId: gmailResult.messageId,
              gmailThreadId: gmailResult.threadId,
              tone: tone || 'professional',
              offerStrategy: offerStrategy || 'standard',
              sourceTable: 'manual_outreach'
            }
          });
          
          // Update contact status
          await db.update(contacts)
            .set({
              contactStatus: 'contacted',
              lastContactedAt: new Date(),
              lastContactChannel: 'email',
              lastThreadId: gmailResult.threadId,
              totalCommunications: sql`COALESCE(${contacts.totalCommunications}, 0) + 1`
            })
            .where(eq(contacts.id, contactId));
          
          console.log(`Email saved to CRM for contact ${contactId}, thread: ${gmailResult.threadId}`);
        }
        
        const response: SendGmailResponse = { 
          success: true,
          threadId: gmailResult.threadId,
          messageId: gmailResult.messageId
        };
        res.json(response);
      } catch (error: any) {
        if (error.status === 401) {
          console.log(`No valid Gmail token found for user ${userId}`);
          res.status(401).json(error);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Gmail send error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to send email"
      });
    }
  });
}