/**
 * Route handlers for Email Replies (Inactive Feature)
 */

import { Router, Application, Request, Response } from 'express';
import { EmailRepliesService } from './service';
import type { AuthenticatedRequestWithGmail } from './types';

export function registerEmailRepliesRoutes(app: Application, requireAuth: any) {
  const router = Router();

  /**
   * Get active contacts with thread information
   */
  router.get('/replies/contacts', requireAuth, async (req: AuthenticatedRequestWithGmail, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const gmailToken = (req.session as any)?.gmailToken || null;
      
      const activeContacts = await EmailRepliesService.getActiveContacts(userId, gmailToken);
      res.json(activeContacts);
    } catch (error) {
      console.error('Error fetching active contacts with threads:', error);
      res.status(500).json({ error: 'Failed to fetch active contacts' });
    }
  });

  /**
   * Get threads for a specific contact
   */
  router.get('/replies/threads/:contactId', requireAuth, async (req: AuthenticatedRequestWithGmail, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const contactId = parseInt(req.params.contactId, 10);
      const gmailToken = (req.session as any)?.gmailToken || null;
      
      if (isNaN(contactId)) {
        return res.status(400).json({ error: 'Invalid contact ID' });
      }
      
      const threads = await EmailRepliesService.getThreadsByContact(contactId, userId, gmailToken);
      res.json(threads);
    } catch (error) {
      console.error('Error fetching threads for contact:', error);
      res.status(500).json({ error: 'Failed to fetch email threads' });
    }
  });

  /**
   * Get a specific thread with its messages
   */
  router.get('/replies/thread/:id', requireAuth, async (req: AuthenticatedRequestWithGmail, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const threadId = parseInt(req.params.id, 10);
      const gmailToken = (req.session as any)?.gmailToken || null;
      
      if (isNaN(threadId)) {
        return res.status(400).json({ error: 'Invalid thread ID' });
      }
      
      const threadData = await EmailRepliesService.getThreadWithMessages(threadId, userId, gmailToken);
      
      if (!threadData) {
        return res.status(404).json({ error: 'Thread not found' });
      }
      
      res.json(threadData);
    } catch (error) {
      console.error('Error fetching thread details:', error);
      res.status(500).json({ error: 'Failed to fetch thread details' });
    }
  });

  /**
   * Create a new email thread
   */
  router.post('/replies/thread', requireAuth, async (req: AuthenticatedRequestWithGmail, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const gmailToken = (req.session as any)?.gmailToken || null;
      
      const thread = await EmailRepliesService.createThread(req.body, userId, gmailToken);
      res.status(201).json(thread);
    } catch (error) {
      console.error('Error creating email thread:', error);
      res.status(500).json({ error: 'Failed to create thread' });
    }
  });

  /**
   * Create a new message in a thread
   */
  router.post('/replies/message', requireAuth, async (req: AuthenticatedRequestWithGmail, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const gmailToken = (req.session as any)?.gmailToken || null;
      
      const message = await EmailRepliesService.createMessage(req.body, userId, gmailToken);
      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating email message:', error);
      res.status(500).json({ error: 'Failed to create message' });
    }
  });

  // Register all routes under /api
  app.use('/api', router);
}