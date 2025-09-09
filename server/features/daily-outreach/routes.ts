import { Router } from 'express';
import { db } from '../../db';
import { 
  dailyOutreachBatches, 
  dailyOutreachItems, 
  userOutreachPreferences,
  users,
  contacts,
  companies
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { outreachScheduler } from './services/scheduler';
import { batchGenerator } from './services/batch-generator';
import { sendGridService } from './services/sendgrid-service';
import type { Request, Response } from 'express';
import streakRoutes from './routes-streak';

const router = Router();

// Mount streak routes
router.use('/', streakRoutes);

// Get user's outreach preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const [preferences] = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId));
    
    if (!preferences) {
      // Return default preferences if none exist
      return res.json({
        enabled: false,
        scheduleDays: ['mon', 'tue', 'wed'],
        scheduleTime: '09:00',
        timezone: 'America/New_York',
        minContactsRequired: 5
      });
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching outreach preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user's outreach preferences
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { enabled, scheduleDays, scheduleTime, timezone, minContactsRequired, activeProductId } = req.body;
    
    // Check if preferences exist
    const [existing] = await db
      .select()
      .from(userOutreachPreferences)
      .where(eq(userOutreachPreferences.userId, userId));
    
    let preferences;
    if (existing) {
      // Update existing preferences
      [preferences] = await db
        .update(userOutreachPreferences)
        .set({
          enabled,
          scheduleDays,
          scheduleTime,
          timezone,
          minContactsRequired,
          activeProductId,
          updatedAt: new Date()
        })
        .where(eq(userOutreachPreferences.userId, userId))
        .returning();
    } else {
      // Create new preferences
      [preferences] = await db
        .insert(userOutreachPreferences)
        .values({
          userId,
          enabled,
          scheduleDays,
          scheduleTime,
          timezone,
          minContactsRequired,
          activeProductId
        })
        .returning();
    }
    
    // Update scheduler
    if (enabled) {
      await outreachScheduler.updateUserPreferences(userId, preferences);
    } else {
      await outreachScheduler.disableUserOutreach(userId);
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error updating outreach preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Manual trigger for testing (only in development)
router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Manual trigger not allowed in production' });
    }
    
    // Get user details
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate batch
    const batch = await batchGenerator.generateDailyBatch(userId);
    
    if (!batch) {
      return res.json({ 
        success: false, 
        message: 'Not enough contacts available. Please add more contacts first.' 
      });
    }
    
    // Send email
    const sent = await sendGridService.sendDailyNudgeEmail(user, batch);
    
    if (sent) {
      // Update last nudge sent
      await db
        .update(userOutreachPreferences)
        .set({ lastNudgeSent: new Date() })
        .where(eq(userOutreachPreferences.userId, userId));
    }
    
    res.json({ 
      success: sent, 
      batchId: batch.id,
      secureToken: batch.secureToken,
      itemCount: batch.items.length,
      message: sent 
        ? 'Daily nudge email sent successfully' 
        : 'Failed to send email. Check SendGrid configuration.'
    });
  } catch (error) {
    console.error('Error triggering manual outreach:', error);
    res.status(500).json({ error: 'Failed to trigger outreach' });
  }
});

// Get batch by secure token (no auth required - token is the auth)
router.get('/batch/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    // Find batch by secure token
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found or expired' });
    }
    
    // Check if expired
    if (new Date() > new Date(batch.expiresAt)) {
      await db
        .update(dailyOutreachBatches)
        .set({ status: 'expired' })
        .where(eq(dailyOutreachBatches.id, batch.id));
      
      return res.status(410).json({ error: 'This link has expired' });
    }
    
    // Get batch items with contact and company details
    const items = await db
      .select({
        item: dailyOutreachItems,
        contact: contacts,
        company: companies
      })
      .from(dailyOutreachItems)
      .innerJoin(contacts, eq(dailyOutreachItems.contactId, contacts.id))
      .innerJoin(companies, eq(dailyOutreachItems.companyId, companies.id))
      .where(eq(dailyOutreachItems.batchId, batch.id));
    
    res.json({
      batch,
      items: items.map(({ item, contact, company }) => ({
        ...item,
        contact,
        company
      }))
    });
  } catch (error) {
    console.error('Error fetching batch:', error);
    res.status(500).json({ error: 'Failed to fetch batch' });
  }
});

// Update outreach item (edit email content)
router.put('/batch/:token/item/:itemId', async (req: Request, res: Response) => {
  try {
    const { token, itemId } = req.params;
    const { emailSubject, emailBody } = req.body;
    
    // Verify batch exists and is valid
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }
    
    if (new Date() > new Date(batch.expiresAt)) {
      return res.status(410).json({ error: 'This link has expired' });
    }
    
    // Verify item belongs to this batch
    const [item] = await db
      .select()
      .from(dailyOutreachItems)
      .where(
        and(
          eq(dailyOutreachItems.id, parseInt(itemId)),
          eq(dailyOutreachItems.batchId, batch.id)
        )
      );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Update the item
    const [updated] = await db
      .update(dailyOutreachItems)
      .set({
        emailSubject,
        emailBody,
        editedContent: JSON.stringify({ subject: emailSubject, body: emailBody }),
        status: 'edited'
      })
      .where(eq(dailyOutreachItems.id, parseInt(itemId)))
      .returning();
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating outreach item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Mark item as sent
router.post('/batch/:token/item/:itemId/sent', async (req: Request, res: Response) => {
  try {
    const { token, itemId } = req.params;
    
    // Verify batch
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch || new Date() > new Date(batch.expiresAt)) {
      return res.status(404).json({ error: 'Invalid or expired batch' });
    }
    
    // Update item status
    const [updated] = await db
      .update(dailyOutreachItems)
      .set({
        status: 'sent',
        sentAt: new Date()
      })
      .where(
        and(
          eq(dailyOutreachItems.id, parseInt(itemId)),
          eq(dailyOutreachItems.batchId, batch.id)
        )
      )
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    // Check if all items are processed
    const pendingItems = await db
      .select()
      .from(dailyOutreachItems)
      .where(
        and(
          eq(dailyOutreachItems.batchId, batch.id),
          eq(dailyOutreachItems.status, 'pending')
        )
      );
    
    // Update batch status if all items are processed
    if (pendingItems.length === 0) {
      await db
        .update(dailyOutreachBatches)
        .set({ status: 'complete' })
        .where(eq(dailyOutreachBatches.id, batch.id));
    } else if (batch.status === 'pending') {
      await db
        .update(dailyOutreachBatches)
        .set({ status: 'partial' })
        .where(eq(dailyOutreachBatches.id, batch.id));
    }
    
    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error marking item as sent:', error);
    res.status(500).json({ error: 'Failed to mark as sent' });
  }
});

// Skip an item
router.post('/batch/:token/item/:itemId/skip', async (req: Request, res: Response) => {
  try {
    const { token, itemId } = req.params;
    
    // Verify batch
    const [batch] = await db
      .select()
      .from(dailyOutreachBatches)
      .where(eq(dailyOutreachBatches.secureToken, token));
    
    if (!batch || new Date() > new Date(batch.expiresAt)) {
      return res.status(404).json({ error: 'Invalid or expired batch' });
    }
    
    // Update item status
    const [updated] = await db
      .update(dailyOutreachItems)
      .set({ status: 'skipped' })
      .where(
        and(
          eq(dailyOutreachItems.id, parseInt(itemId)),
          eq(dailyOutreachItems.batchId, batch.id)
        )
      )
      .returning();
    
    res.json({ success: true, item: updated });
  } catch (error) {
    console.error('Error skipping item:', error);
    res.status(500).json({ error: 'Failed to skip item' });
  }
});

export default router;