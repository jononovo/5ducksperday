/**
 * Route handlers for User Account Settings
 */

import { Router, Application, Request, Response, NextFunction } from 'express';
import { UserAccountSettingsService } from './service';
import type { AuthenticatedRequest } from './types';

export function registerUserAccountSettingsRoutes(app: Application, requireAuth: any) {
  const router = Router();

  /**
   * Get user preferences (can be accessed without auth for demo user)
   */
  router.get('/user/preferences', async (req: Request, res: Response) => {
    try {
      // For compatibility with existing functionality
      const userId = req.isAuthenticated && req.isAuthenticated() && req.user ? (req.user as any).id : 1;
      
      const preferences = await UserAccountSettingsService.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error('Error getting user preferences:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get user preferences"
      });
    }
  });

  /**
   * Update user preferences
   */
  router.post('/user/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const preferences = await UserAccountSettingsService.updateUserPreferences(
        req.user!.id,
        req.body
      );
      res.json(preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to update user preferences"
      });
    }
  });

  /**
   * Get user profile
   */
  router.get('/user/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const profile = await UserAccountSettingsService.getUserProfile(userId);
      
      if (!profile) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch user profile' 
      });
    }
  });

  /**
   * Update user profile
   */
  router.put('/user/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const profile = await UserAccountSettingsService.updateUserProfile(userId, req.body);
      
      if (!profile) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.json(profile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      
      // Handle validation errors
      if (error instanceof Error && error.message.includes('Username')) {
        res.status(400).json({ message: error.message });
        return;
      }
      
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update user profile' 
      });
    }
  });

  /**
   * Get email preferences
   */
  router.get('/email-preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const preferences = await UserAccountSettingsService.getEmailPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error('Error fetching email preferences:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch email preferences' 
      });
    }
  });

  /**
   * Update email preferences
   */
  router.put('/email-preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = (req.user as any).id;
      const preferences = await UserAccountSettingsService.updateEmailPreferences(userId, req.body);
      res.json(preferences);
    } catch (error) {
      console.error('Error updating email preferences:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update email preferences' 
      });
    }
  });

  // Register all routes under /api
  app.use('/api', router);
}