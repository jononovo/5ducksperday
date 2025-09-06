import { Router, Request, Response, Application } from 'express';
import { emailTemplatesService } from './service';
import { insertEmailTemplateSchema } from '@shared/schema';

// Helper function to safely get user ID from request
function getUserId(req: Request): number {
  console.log('EmailTemplates getUserId() called:', {
    path: req.path,
    method: req.method,
    hasUser: !!(req as any).user,
    userId: (req as any).user ? (req as any).user.id : 'none',
    hasFirebaseUser: !!(req as any).firebaseUser,
    firebaseUserId: (req as any).firebaseUser ? (req as any).firebaseUser.id : 'none',
    timestamp: new Date().toISOString()
  });

  try {
    // First check if user is authenticated through session
    if ((req as any).isAuthenticated && (req as any).isAuthenticated() && (req as any).user && (req as any).user.id) {
      const userId = (req as any).user.id;
      console.log('EmailTemplates: User ID from session authentication:', userId);
      return userId;
    }
    
    // Then check for Firebase authentication
    if ((req as any).firebaseUser && (req as any).firebaseUser.id) {
      const userId = (req as any).firebaseUser.id;
      console.log('EmailTemplates: User ID from Firebase authentication:', userId);
      return userId;
    }
    
    // If no authentication is found
    console.log('EmailTemplates: No authentication found, defaulting to demo user ID 1');
    return 1; // Default to demo user
  } catch (error) {
    console.error('EmailTemplates: Error getting user ID:', error);
    return 1; // Default to demo user on error
  }
}

const handlers = {
  async list(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
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

  async get(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
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

  async create(req: Request, res: Response) {
    try {
      const userId = getUserId(req);
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

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
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

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = getUserId(req);
      
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

export function registerEmailTemplatesRoutes(app: Application, requireAuth: any) {
  const router = Router();
  
  // List all templates for the user
  router.get('/', requireAuth, handlers.list);
  
  // Get a specific template
  router.get('/:id', requireAuth, handlers.get);
  
  // Create a new template
  router.post('/', requireAuth, handlers.create);
  
  // Update an existing template
  router.put('/:id', requireAuth, handlers.update);
  
  // Delete a template
  router.delete('/:id', requireAuth, handlers.delete);
  
  // Register all routes under /api/email-templates
  app.use('/api/email-templates', router);
}