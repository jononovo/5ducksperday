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
      
      const campaign = await storage.getCampaignWithMetrics(campaignId, userId);
      
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
      
      // Ensure start_date is always set
      const startDate = req.body.start_date ? new Date(req.body.start_date) :
                       (req.body.sendTimePreference === 'immediate' ? new Date() :
                        req.body.scheduleDate ? new Date(req.body.scheduleDate) : 
                        new Date()); // Default to now if nothing else is specified
      
      // Calculate end_date: 14 days after start_date (using durationDays if provided, default to 14)
      const durationDays = req.body.durationDays || 14;
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + durationDays);
      
      const campaignData = {
        ...req.body,
        userId,
        start_date: startDate,     // Using snake_case to match database columns
        end_date: endDate,         // Using snake_case to match database columns  
        durationDays: durationDays
      };
      
      // Debug: Log what we're sending before validation
      console.log('Campaign data before validation:', JSON.stringify(campaignData, null, 2));
      
      // Validate request body
      const parseResult = insertCampaignSchema.safeParse(campaignData);
      
      if (!parseResult.success) {
        console.error('Validation errors:', parseResult.error.errors);
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      // Debug: Log what we're sending after validation
      console.log('Campaign data after validation (being sent to DB):', JSON.stringify(parseResult.data, null, 2));
      
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

  // Restart campaign with different modes
  router.post('/:id/restart', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaignId = parseInt(req.params.id);
      const { mode } = req.body; // 'all' or 'unsent'
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      if (!mode || !['all', 'unsent'].includes(mode)) {
        return res.status(400).json({ message: 'Invalid restart mode. Use "all" or "unsent"' });
      }
      
      // Verify campaign belongs to user
      const existing = await storage.getCampaign(campaignId, userId);
      if (!existing) {
        return res.status(404).json({ message: 'Campaign not found or access denied' });
      }
      
      // Restart the campaign based on mode
      const result = await storage.restartCampaign(campaignId, userId, mode);
      res.json({ 
        success: true, 
        message: `Campaign restarted in ${mode} mode`,
        campaign: result
      });
      
    } catch (error) {
      console.error('Error restarting campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to restart campaign' 
      });
    }
  });

  app.use('/api/campaigns', router);
}
