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
      
      // Map frontend fields to database fields
      const mappedData = {
        userId,
        label: req.body.title || req.body.exampleCompany || 'Untitled Profile',
        targetDescription: [
          req.body.searchPrompt,
          req.body.additionalContext
        ].filter(Boolean).join(' '),
        industries: req.body.industry ? [req.body.industry] : [],
        roles: req.body.jobTitles || [],
        locations: req.body.geography ? [req.body.geography] : [],
        companySizes: [],
        techStack: req.body.currentSolutions ? [req.body.currentSolutions] : [],
        notes: req.body.additionalContext || ''
      };
      
      // Validate mapped data
      const parseResult = insertTargetCustomerProfileSchema.safeParse(mappedData);
      
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
      
      // Map frontend fields to database fields for update
      const mappedData: any = {};
      
      if (req.body.title !== undefined) mappedData.label = req.body.title;
      if (req.body.exampleCompany !== undefined) mappedData.label = req.body.exampleCompany;
      
      if (req.body.searchPrompt !== undefined || req.body.additionalContext !== undefined) {
        mappedData.targetDescription = [
          req.body.searchPrompt,
          req.body.additionalContext
        ].filter(Boolean).join(' ');
      }
      
      if (req.body.industry !== undefined) mappedData.industries = req.body.industry ? [req.body.industry] : [];
      if (req.body.jobTitles !== undefined) mappedData.roles = req.body.jobTitles;
      if (req.body.geography !== undefined) mappedData.locations = req.body.geography ? [req.body.geography] : [];
      if (req.body.companySize !== undefined) mappedData.companySizes = req.body.companySize ? [req.body.companySize] : [];
      if (req.body.currentSolutions !== undefined) mappedData.techStack = req.body.currentSolutions ? [req.body.currentSolutions] : [];
      if (req.body.additionalContext !== undefined) mappedData.notes = req.body.additionalContext;
      
      // Validate update data
      const updateSchema = insertTargetCustomerProfileSchema.partial().omit({ userId: true });
      const parseResult = updateSchema.safeParse(mappedData);
      
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