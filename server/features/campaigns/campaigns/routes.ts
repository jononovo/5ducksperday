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
      const startDate = req.body.startDate ? new Date(req.body.startDate) :
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
        startDate: startDate,     // Using camelCase to match Drizzle ORM expectations
        endDate: endDate,         // Using camelCase to match Drizzle ORM expectations  
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
      
      // If campaign has a contact list, populate campaign_recipients
      if (campaign.contactListId) {
        try {
          // Get all contacts from the contact list
          const contacts = await storage.listContactsByListId(campaign.contactListId);
          
          if (contacts.length > 0) {
            // Prepare recipient records
            const recipients = contacts.map(contact => ({
              campaignId: campaign.id,
              recipientEmail: contact.email,
              recipientFirstName: contact.name?.split(' ')[0] || '',
              recipientLastName: contact.name?.split(' ').slice(1).join(' ') || '',
              recipientCompany: contact.company?.name || '',
              status: 'queued' as const,  // Start with 'queued' status for processing
              createdAt: new Date(),
              updatedAt: new Date()
            }));
            
            // Batch insert recipients
            await storage.createCampaignRecipients(recipients);
            console.log(`Populated ${recipients.length} recipients for campaign ${campaign.id}`);
          }
        } catch (recipientError) {
          // Log error but don't fail the campaign creation
          console.error('Error populating campaign recipients:', recipientError);
          // Could optionally add a warning to the response
        }
      }
      
      res.status(201).json(campaign);
      
    } catch (error) {
      console.error('Error creating campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create campaign' 
      });
    }
  });

  // Approve emails in review queue
  router.post('/:id/review/approve', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaignId = parseInt(req.params.id);
      const { recipientIds } = req.body;
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      // Verify campaign belongs to user
      const campaign = await storage.getCampaign(campaignId, userId);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found or access denied' });
      }
      
      // Use the email queue processor to approve the batch
      const { emailQueueProcessor } = await import('../email-queue-processor');
      await emailQueueProcessor.approveBatch(campaignId, recipientIds);
      
      res.json({ message: 'Emails approved for sending' });
    } catch (error) {
      console.error('Error approving emails:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to approve emails' 
      });
    }
  });

  // Reject emails in review queue
  router.post('/:id/review/reject', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaignId = parseInt(req.params.id);
      const { recipientIds } = req.body;
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      // Verify campaign belongs to user
      const campaign = await storage.getCampaign(campaignId, userId);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found or access denied' });
      }
      
      // Use the email queue processor to reject the batch
      const { emailQueueProcessor } = await import('../email-queue-processor');
      await emailQueueProcessor.rejectBatch(campaignId, recipientIds);
      
      res.json({ message: 'Emails rejected for regeneration' });
    } catch (error) {
      console.error('Error rejecting emails:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to reject emails' 
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
      const { mode } = req.body; // 'all' or 'failed'
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      if (!mode || !['all', 'failed'].includes(mode)) {
        return res.status(400).json({ message: 'Invalid restart mode. Use "all" or "failed"' });
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

  // Add contacts to an active campaign
  router.post('/:id/add-contacts', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const campaignId = parseInt(req.params.id);
      const { contactIds } = req.body;
      
      if (isNaN(campaignId)) {
        return res.status(400).json({ message: 'Invalid campaign ID' });
      }
      
      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'Contact IDs array is required' });
      }
      
      // Verify campaign exists, belongs to user, and is active
      const campaign = await storage.getCampaign(campaignId, userId);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found or access denied' });
      }
      
      // Allow adding to any campaign, but provide appropriate messaging
      let statusNote = '';
      if (campaign.status === 'completed') {
        statusNote = 'Campaign is completed. Use the restart feature to process these new contacts.';
      } else if (campaign.status === 'paused') {
        statusNote = 'Campaign is paused. Contacts will be processed when you resume the campaign.';
      } else if (campaign.status === 'draft') {
        statusNote = 'Campaign is in draft. Contacts will be processed when you activate the campaign.';
      } else if (campaign.status === 'scheduled') {
        statusNote = 'Campaign is scheduled. Contacts will be processed when the campaign activates.';
      } else {
        statusNote = 'Contacts will be processed in the next email queue cycle (within 30 seconds)';
      }
      
      // Get contact details
      const contacts = await storage.getContactsByIds(contactIds, userId);
      
      if (contacts.length === 0) {
        return res.status(404).json({ message: 'No valid contacts found' });
      }
      
      // Prepare recipient records
      const recipients = contacts
        .filter(contact => contact.email) // Only include contacts with email
        .map(contact => ({
          campaignId: campaignId,
          contactId: contact.id,
          recipientEmail: contact.email,
          recipientFirstName: contact.name?.split(' ')[0] || '',
          recipientLastName: contact.name?.split(' ').slice(1).join(' ') || '',
          recipientCompany: '', // Company name will be populated during email generation if needed
          status: 'queued' as const, // Start with 'queued' for immediate processing
          createdAt: new Date(),
          updatedAt: new Date()
        }));
      
      if (recipients.length === 0) {
        return res.status(400).json({ message: 'No contacts with valid email addresses found' });
      }
      
      // Batch insert recipients (duplicates automatically ignored by unique constraint)
      await storage.createCampaignRecipients(recipients);
      
      console.log(`[Add to Campaign] Added ${recipients.length} new recipients to campaign ${campaignId} (${campaign.name})`);
      console.log(`[Add to Campaign] Campaign status: ${campaign.status}, daily limit: ${campaign.maxEmailsPerDay || 'unlimited'}`);
      
      res.json({ 
        success: true,
        message: `Successfully added ${recipients.length} contacts to the campaign`,
        addedCount: recipients.length,
        campaignStatus: campaign.status,
        note: statusNote
      });
      
    } catch (error) {
      console.error('Error adding contacts to campaign:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to add contacts to campaign' 
      });
    }
  });

  app.use('/api/campaigns', router);
}
