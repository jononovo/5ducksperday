/**
 * Route handlers for Campaigns (Inactive Feature)
 */

import { Router, Application, Request, Response } from 'express';
import { CampaignsService } from './service';
import type { AuthenticatedRequest } from './types';

export function registerCampaignsRoutes(app: Application, requireAuth: any) {
  const router = Router();

  /**
   * List all campaigns for a user
   */
  router.get('/campaigns', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const campaigns = await CampaignsService.listCampaigns(userId);
      res.json(campaigns);
    } catch (error) {
      console.error('Error listing campaigns:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to list campaigns' 
      });
    }
  });

  /**
   * Get a specific campaign
   */
  router.get('/campaigns/:campaignId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const campaignId = parseInt(req.params.campaignId);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      const campaign = await CampaignsService.getCampaign(campaignId, userId);
      
      if (!campaign) {
        res.status(404).json({ message: 'Campaign not found' });
        return;
      }
      
      res.json(campaign);
    } catch (error) {
      console.error('Error getting campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to get campaign' 
      });
    }
  });

  /**
   * Create a new campaign
   */
  router.post('/campaigns', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = CampaignsService.getUserId(req);
      
      // Campaign functionality is currently inactive - basic validation
      const campaignData = {
        ...req.body,
        userId,
        totalCompanies: 0
      };
      
      // Basic validation
      if (!campaignData.name) {
        return res.status(400).json({ 
          message: 'Campaign name is required' 
        });
      }
      
      const campaign = await CampaignsService.createCampaign(campaignData);
      res.json(campaign);
    } catch (error) {
      console.error('Campaign creation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'An unexpected error occurred while creating the campaign'
      });
    }
  });

  /**
   * Update an existing campaign
   */
  router.patch('/campaigns/:campaignId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const campaignId = parseInt(req.params.campaignId);
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      // Campaign functionality is currently inactive - basic validation
      const updateData = req.body;
      
      const updated = await CampaignsService.updateCampaign(campaignId, updateData, userId);
      
      if (!updated) {
        res.status(404).json({ message: 'Campaign not found' });
        return;
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Campaign update error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update campaign' 
      });
    }
  });

  // Register all routes under /api
  app.use('/api', router);
}