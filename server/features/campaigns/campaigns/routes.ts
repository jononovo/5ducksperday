import { Router, Request, Response, Application } from 'express';
import { storage } from '../../../storage';
import { insertCampaignSchema, updateCampaignSchema } from '@shared/schema';
import { getUserId } from '../../../utils/auth';

export function registerCampaignsRoutes(app: Application, requireAuth: any) {
  const router = Router();

  // List all campaigns for authenticated user
  router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaigns = await storage.listCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch campaigns' 
      });
    }
  });

  // Get specific campaign
  router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      const campaign = await storage.getCampaign(campaignId, userId);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch campaign' 
      });
    }
  });

  // Create new campaign
  router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      // Validate request body
      const parseResult = insertCampaignSchema.safeParse({
        ...req.body,
        userId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      const campaign = await storage.createCampaign(parseResult.data);
      res.status(201).json(campaign);
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create campaign' 
      });
    }
  });

  // Update campaign
  router.put('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      // Verify campaign belongs to user
      const existing = await storage.getCampaign(campaignId, userId);
      if (!existing) {
        return res.status(404).json({ message: 'Campaign not found or access denied' });
      }
      
      // Validate and sanitize update payload - exclude userId and other immutable fields
      const parseResult = updateCampaignSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      const updated = await storage.updateCampaign(campaignId, parseResult.data);
      res.json(updated);
      
    } catch (error) {
      console.error('Error updating campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update campaign' 
      });
    }
  });

  // Delete campaign
  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaignId = parseInt(req.params.id);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      // Verify campaign belongs to user before deleting
      const existing = await storage.getCampaign(campaignId, userId);
      if (!existing) {
        return res.status(404).json({ message: 'Campaign not found or access denied' });
      }
      
      await storage.deleteCampaign(campaignId, userId);
      res.status(204).send();
      
    } catch (error) {
      console.error('Error deleting campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to delete campaign' 
      });
    }
  });

  app.use('/api/campaigns', router);
}
