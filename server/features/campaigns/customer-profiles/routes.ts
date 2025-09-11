import { Router, Request, Response, Application } from 'express';
import { storage } from '../../../storage';
import { insertTargetCustomerProfileSchema, type TargetCustomerProfile, type InsertTargetCustomerProfile } from '@shared/schema';
import { getUserId } from '../../../utils/auth';
import { z } from 'zod';

export function registerCustomerProfilesRoutes(app: Application, requireAuth: any) {
  const router = Router();

  // Get all customer profiles for the authenticated user
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profiles = await storage.listCustomerProfiles(userId);
      res.json(profiles);
    } catch (error) {
      console.error('Error fetching customer profiles:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch customer profiles' 
      });
    }
  });

  // Get specific customer profile
  router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profileId = parseInt(req.params.id);
      
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }
      
      const profile = await storage.getCustomerProfile(profileId, userId);
      
      if (!profile) {
        return res.status(404).json({ message: 'Customer profile not found' });
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Error fetching customer profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch customer profile' 
      });
    }
  });

  // Create new customer profile
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      // Validate request body
      const parseResult = insertTargetCustomerProfileSchema.safeParse({
        ...req.body,
        userId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      const profile = await storage.createCustomerProfile(parseResult.data);
      res.status(201).json(profile);
      
    } catch (error) {
      console.error('Error creating customer profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create customer profile' 
      });
    }
  });

  // Update customer profile
  router.put('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profileId = parseInt(req.params.id);
      
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }
      
      // Check if profile exists and belongs to user
      const existing = await storage.getCustomerProfile(profileId, userId);
      if (!existing) {
        return res.status(404).json({ message: 'Customer profile not found' });
      }
      
      // Validate update data
      const updateSchema = insertTargetCustomerProfileSchema.partial().omit({ userId: true });
      const parseResult = updateSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      const updated = await storage.updateCustomerProfile(profileId, parseResult.data);
      res.json(updated);
      
    } catch (error) {
      console.error('Error updating customer profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update customer profile' 
      });
    }
  });

  // Delete customer profile
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const profileId = parseInt(req.params.id);
      
      if (isNaN(profileId)) {
        return res.status(400).json({ message: 'Invalid profile ID' });
      }
      
      // Check if profile exists and belongs to user
      const existing = await storage.getCustomerProfile(profileId, userId);
      if (!existing) {
        return res.status(404).json({ message: 'Customer profile not found' });
      }
      
      await storage.deleteCustomerProfile(profileId, userId);
      res.status(204).send();
      
    } catch (error) {
      console.error('Error deleting customer profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to delete customer profile' 
      });
    }
  });

  app.use('/api/customer-profiles', router);
}