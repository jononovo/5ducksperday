import { Router } from 'express';
import { emailTemplatesService } from './service';
import type { AuthenticatedRequest, EmailTemplatesRouteHandlers } from './types';
import { insertEmailTemplateSchema } from '@shared/schema';

const handlers: EmailTemplatesRouteHandlers = {
  async list(req: AuthenticatedRequest, res) {
    try {
      const userId = req.user?.id || 1;
      console.log(`API: Listing email templates for user ${userId}`);
      
      const templates = await emailTemplatesService.listTemplates(userId);
      console.log(`API: Found ${templates.length} email templates for user ${userId}`);
      
      res.json(templates);
    } catch (error) {
      console.error('Failed to list email templates:', error);
      res.status(500).json({ 
        error: 'Failed to fetch email templates',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async get(req: AuthenticatedRequest, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 1;
      
      const template = await emailTemplatesService.getTemplate(Number(id), userId);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Failed to get email template:', error);
      res.status(500).json({ 
        error: 'Failed to fetch email template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async create(req: AuthenticatedRequest, res) {
    try {
      const userId = req.user?.id || 1;
      const data = req.body;
      
      console.log('API: Creating email template:', {
        name: data.name,
        userId
      });
      
      // Validate the request body
      const validatedData = insertEmailTemplateSchema.parse({
        ...data,
        userId
      });
      
      const template = await emailTemplatesService.createTemplate(validatedData);
      
      console.log('API: Created email template:', {
        id: template.id,
        name: template.name
      });
      
      res.json(template);
    } catch (error) {
      console.error('Failed to create email template:', error);
      res.status(500).json({ 
        error: 'Failed to create email template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async update(req: AuthenticatedRequest, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 1;
      const data = req.body;
      
      console.log('API: Updating email template:', {
        id,
        userId,
        name: data.name
      });
      
      const template = await emailTemplatesService.updateTemplate(
        Number(id), 
        data, 
        userId
      );
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      console.log('API: Updated email template:', {
        id: template.id,
        name: template.name
      });
      
      res.json(template);
    } catch (error) {
      console.error('Failed to update email template:', error);
      res.status(500).json({ 
        error: 'Failed to update email template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async delete(req: AuthenticatedRequest, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 1;
      
      console.log('API: Deleting email template:', {
        id,
        userId
      });
      
      await emailTemplatesService.deleteTemplate(Number(id), userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete email template:', error);
      res.status(500).json({ 
        error: 'Failed to delete email template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export function createEmailTemplatesRouter(): Router {
  const router = Router();
  
  // List all templates for the user
  router.get('/email-templates', handlers.list);
  
  // Get a specific template
  router.get('/email-templates/:id', handlers.get);
  
  // Create a new template
  router.post('/email-templates', handlers.create);
  
  // Update an existing template
  router.put('/email-templates/:id', handlers.update);
  
  // Delete a template
  router.delete('/email-templates/:id', handlers.delete);
  
  return router;
}