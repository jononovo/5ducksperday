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
            isDefault: true,
            source: 'registered' // Auto-generated profile from registered user
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

  // Get default sender profile for the authenticated user
  router.get('/default', requireAuth, async (req: Request, res: Response) => {
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
            isDefault: true,
            source: 'registered' // Auto-generated profile from registered user
          });
          return res.json(defaultProfile);
        }
        return res.json(null);
      }
      
      // Find the default profile or return the first one
      const defaultProfile = profiles.find(p => p.isDefault) || profiles[0];
      res.json(defaultProfile);
    } catch (error) {
      console.error('Error fetching default sender profile:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch default sender profile' 
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
      
      // Get first and last names from request or parse from display/name field
      let firstName = req.body.firstName;
      let lastName = req.body.lastName;
      
      // If first/last names not provided separately, parse from displayName or name
      if (!firstName && !lastName) {
        const baseName = req.body.displayName || req.body.name || 'Unknown Sender';
        const nameParts = baseName.split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ');
      }
      
      const companyName = req.body.companyName;
      const title = req.body.title; // Honorific (Dr., Mr., Ms.)
      
      // Smart composition logic for displayName
      let composedDisplayName: string;
      
      // Include title if present
      const namePrefix = title ? `${title} ` : '';
      
      if (lastName) {
        // Has last name: use full name with optional title
        composedDisplayName = `${namePrefix}${firstName} ${lastName}`.trim();
      } else if (companyName) {
        // No last name but has company: "First @ CompanyName"
        composedDisplayName = `${namePrefix}${firstName} @ ${companyName}`.trim();
      } else {
        // No last name or company: just first name with optional title
        composedDisplayName = `${namePrefix}${firstName}`.trim();
      }
      
      // Map frontend fields to database fields with composed displayName
      const mappedData = {
        userId,
        displayName: composedDisplayName,
        email: req.body.email,
        firstName,
        lastName,
        title: req.body.title, // Honorific
        companyPosition: req.body.companyPosition, // Job role
        companyName: req.body.companyName,
        companyWebsite: req.body.companyWebsite,
        isDefault: req.body.isDefault || false
      };
      
      // Validate mapped data
      const parseResult = insertSenderProfileSchema.safeParse(mappedData);
      
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
      
      // Map frontend fields to database fields for update
      const mappedData: any = {};
      
      // Get the current values or update with new ones
      let firstName = req.body.firstName !== undefined ? req.body.firstName : existing.firstName;
      let lastName = req.body.lastName !== undefined ? req.body.lastName : existing.lastName;
      let companyName = req.body.companyName !== undefined ? req.body.companyName : existing.companyName;
      let title = req.body.title !== undefined ? req.body.title : existing.title;
      
      // If first/last names not provided but displayName is, parse it
      if (!firstName && !lastName && (req.body.displayName || req.body.name)) {
        const baseName = req.body.displayName || req.body.name;
        const nameParts = baseName.split(' @ ')[0].split(' '); // Remove any existing @ company first
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ');
      }
      
      // Update the individual fields
      if (req.body.firstName !== undefined) mappedData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) mappedData.lastName = req.body.lastName;
      if (req.body.companyName !== undefined) mappedData.companyName = req.body.companyName;
      if (req.body.title !== undefined) mappedData.title = req.body.title; // Honorific
      if (req.body.companyPosition !== undefined) mappedData.companyPosition = req.body.companyPosition; // Job role
      
      // Smart composition logic for displayName
      let composedDisplayName: string;
      
      // Include title if present
      const namePrefix = title ? `${title} ` : '';
      
      if (lastName) {
        // Has last name: use full name with optional title
        composedDisplayName = `${namePrefix}${firstName} ${lastName}`.trim();
      } else if (companyName) {
        // No last name but has company: "First @ CompanyName"
        composedDisplayName = `${namePrefix}${firstName} @ ${companyName}`.trim();
      } else {
        // No last name or company: just first name with optional title
        composedDisplayName = `${namePrefix}${firstName}`.trim();
      }
      
      mappedData.displayName = composedDisplayName;
      
      // Map other fields
      if (req.body.email !== undefined) mappedData.email = req.body.email;
      if (req.body.companyWebsite !== undefined) mappedData.companyWebsite = req.body.companyWebsite;
      if (req.body.isDefault !== undefined) mappedData.isDefault = req.body.isDefault;
      
      // Validate update data
      const updateSchema = insertSenderProfileSchema.partial().omit({ userId: true });
      const parseResult = updateSchema.safeParse(mappedData);
      
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