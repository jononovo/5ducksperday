import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth';
import { GmailOAuthService } from './oauth-service';
import { SendGmailRequest, SendGmailResponse } from './types';

const router = Router();

router.post('/send-gmail', requireAuth, async (req: Request, res: Response) => {
  try {
    const { to, subject, content } = req.body as SendGmailRequest;

    if (!to || !subject || !content) {
      res.status(400).json({ message: "Missing required email fields" });
      return;
    }

    const userId = (req as any).user.id;
    const userEmail = (req as any).user.email;
    
    try {
      await GmailOAuthService.sendEmail(userId, userEmail, to, subject, content);
      
      const response: SendGmailResponse = { success: true };
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

export const sendGmailRouter = router;