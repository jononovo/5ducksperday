import express, { Request, Response } from "express";
import { GamificationService } from "./service";

function requireAuth(req: Request, res: Response, next: express.NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function getUserId(req: Request): number {
  return (req.user as any).id;
}

export function registerGamificationRoutes(app: express.Express) {
  // Easter egg claim endpoint
  app.post('/api/credits/easter-egg', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { query } = req.body;
      
      const result = await GamificationService.claimEasterEgg(userId, query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(409).json(result);
      }
    } catch (error) {
      res.status(500).json({ message: "Easter egg claim failed" });
    }
  });

  // Trigger notification endpoint
  app.post('/api/notifications/trigger', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { trigger } = req.body;
      
      const result = await GamificationService.triggerNotification(userId, trigger);
      
      if (result.shouldShow) {
        res.json(result);
      } else {
        res.status(409).json({ shouldShow: false, message: "Notification already shown or not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Notification trigger failed" });
    }
  });

  // Mark notification/badge as shown
  app.post('/api/notifications/mark-shown', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { notificationId, badgeId } = req.body;
      
      if (typeof badgeId === 'number') {
        // Award badge
        await GamificationService.awardBadge(userId, badgeId);
      } else if (typeof notificationId === 'number') {
        // Mark notification as shown
        await GamificationService.markNotificationShown(userId, notificationId);
      } else {
        return res.status(400).json({ message: "Either notificationId or badgeId is required" });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification/badge as shown" });
    }
  });

  // Get notification/badge status
  app.get('/api/notifications/status', requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      // We need to get the credits data to check notifications and badges
      // Using CreditService.getUserCredits since it's the source of truth
      const { CreditService } = await import('../credits/service');
      const credits = await CreditService.getUserCredits(userId);
      
      res.json({ 
        notifications: credits.notifications || [],
        badges: credits.badges || [],
        isWaitlistMember: credits.notifications?.includes(1) || false
      });
    } catch (error) {
      console.error('Error fetching notification status:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch notification status' 
      });
    }
  });
}