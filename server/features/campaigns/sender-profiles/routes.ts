import { Router, Request, Response, Application } from 'express';
import { storage } from '../../../storage';
import { insertSenderProfileSchema, type SenderProfile, type InsertSenderProfile } from '@shared/schema';
import { getUserId } from '../../../utils/auth';
import { z } from 'zod';

export function registerSenderProfilesRoutes(app: Application, requireAuth: any) {
  const router = Router();

  // Get all sender profiles for the authenticated user
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      let profiles = await storage.listSenderProfiles(userId);
      
      // Auto-generate a default profile if user has none
      if (profiles.length === 0) {
        console.log(`Auto-generating default sender profile for user ${userId}`);
        
        // Get user details to create default profile
        const user = await storage.getUserById(userId);
        if (user) {
          const defaultProfile = await storage.createSenderProfile({
            userId,
            displayName: user.username || user.email.split('@')[0],
            email: user.email,
            isDefault: true
          });
          profiles = [defaultProfile];
        }
      }
      
      res.json(profiles);
    } catch (error) {
      console.error('Error fetching sender profiles:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch sender profiles' 
      });
    }
  });

  // Get specific sender profile
  router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profileId = parseInt(req.params.id);
      
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }
      
      const profile = await storage.getSenderProfile(profileId, userId);
      
      if (!profile) {
        return res.status(404).json({ message: 'Sender profile not found' });
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error fetching sender profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch sender profile' 
      });
    }
  });

  // Create new sender profile
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      // Validate request body
      const parseResult = insertSenderProfileSchema.safeParse({
        ...req.body,
        userId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      const profile = await storage.createSenderProfile(parseResult.data);
      res.status(201).json(profile);
      
    } catch (error) {
      console.error('Error creating sender profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create sender profile' 
      });
    }
  });

  // Update sender profile
  router.put('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profileId = parseInt(req.params.id);
      
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }
      
      // Check if profile exists and belongs to user
      const existing = await storage.getSenderProfile(profileId, userId);
      if (!existing) {
        return res.status(404).json({ message: 'Sender profile not found' });
      }
      
      // Validate update data
      const updateSchema = insertSenderProfileSchema.partial().omit({ userId: true });
      const parseResult = updateSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      const updated = await storage.updateSenderProfile(profileId, parseResult.data);
      res.json(updated);
      
    } catch (error) {
      console.error('Error updating sender profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update sender profile' 
      });
    }
  });

  // Delete sender profile
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profileId = parseInt(req.params.id);
      
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }
      
      // Check if profile exists and belongs to user
      const existing = await storage.getSenderProfile(profileId, userId);
      if (!existing) {
        return res.status(404).json({ message: 'Sender profile not found' });
      }
      
      // Don't allow deleting the default profile if it's the only one
      if (existing.isDefault) {
        const allProfiles = await storage.listSenderProfiles(userId);
        if (allProfiles.length === 1) {
          return res.status(400).json({ 
            message: 'Cannot delete the default profile when it\'s the only profile' 
          });
        }
      }
      
      await storage.deleteSenderProfile(profileId, userId);
      res.status(204).send();
      
    } catch (error) {
      console.error('Error deleting sender profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to delete sender profile' 
      });
    }
  });

  app.use('/api/sender-profiles', router);
}