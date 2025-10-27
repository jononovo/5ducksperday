import { Router, Request, Response, Application } from 'express';
import { SearchListsService } from './service';
import { SearchListRequest, UpdateSearchListRequest } from './types';

// Helper function to safely get user ID from request
function getUserId(req: Request): number {
  console.log('getUserId() called:', {
    path: req.path,
    method: req.method,
    sessionID: (req as any).sessionID || 'none',
    hasSession: !!(req as any).session,
    isAuthenticated: (req as any).isAuthenticated ? (req as any).isAuthenticated() : false,
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
      console.log('User ID from session authentication:', userId);
      return userId;
    }
    
    // Then check for Firebase authentication
    if ((req as any).firebaseUser && (req as any).firebaseUser.id) {
      const userId = (req as any).firebaseUser.id;
      console.log('User ID from Firebase authentication:', userId);
      return userId;
    }
    
    // If no authentication is found
    console.log('No authentication found, defaulting to demo user ID 1');
    return 1; // Default to demo user
  } catch (error) {
    console.error('Error getting user ID:', error);
    return 1; // Default to demo user on error
  }
}

export function registerSearchListsRoutes(app: Application, requireAuth: any) {
  const router = Router();

  // Get all lists
  router.get('/', async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const isAuthenticated = (req as any).isAuthenticated && (req as any).isAuthenticated() && (req as any).user;
    
    const lists = await SearchListsService.getSearchLists(userId, isAuthenticated);
    res.json(lists);
  });

  // Get specific list
  router.get('/:listId', requireAuth, async (req: Request, res: Response) => {
    const isAuthenticated = (req as any).isAuthenticated && (req as any).isAuthenticated() && (req as any).user;
    const listId = parseInt(req.params.listId);
    const userId = (req as any).user?.id || 1;
    
    const list = await SearchListsService.getSearchList(listId, userId, isAuthenticated);
    
    if (!list) {
      res.status(404).json({ message: "List not found" });
      return;
    }
    
    res.json(list);
  });

  // Get companies in a list
  router.get('/:listId/companies', async (req: Request, res: Response) => {
    const isAuthenticated = (req as any).isAuthenticated && (req as any).isAuthenticated() && (req as any).user;
    const listId = parseInt(req.params.listId);
    const userId = (req as any).user?.id || 1;
    
    const companies = await SearchListsService.getSearchListCompanies(listId, userId, isAuthenticated);
    res.json(companies);
  });

  // Create new list
  router.post('/', async (req: Request, res: Response) => {
    const body = req.body as SearchListRequest;
    const { companies, prompt, contactSearchConfig } = body;

    console.log(`POST /api/lists called with ${companies?.length || 0} companies`);
    console.log('Call stack context:', new Error().stack?.split('\n')[2]);

    if (!Array.isArray(companies) || !prompt || typeof prompt !== 'string') {
      res.status(400).json({ message: "Invalid request: companies must be an array and prompt must be a string" });
      return;
    }

    try {
      const userId = getUserId(req);
      const list = await SearchListsService.createSearchList(body, userId);
      res.json(list);
    } catch (error) {
      console.error('List creation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  // Update list
  router.put('/:listId', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.listId);
      const body = req.body as UpdateSearchListRequest;
      const { companies, prompt } = body;
      
      console.log(`PUT /api/lists/${listId} called by user ${userId} with ${companies?.length || 0} companies`);
      
      // Validate listId parameter
      if (isNaN(listId)) {
        console.log(`PUT request failed: Invalid listId ${req.params.listId}`);
        return res.status(400).json({
          message: "Invalid list ID"
        });
      }
      
      // Validate companies array
      if (!Array.isArray(companies)) {
        return res.status(400).json({
          message: "Companies must be an array"
        });
      }
      
      const updated = await SearchListsService.updateSearchList(listId, body, userId);
      
      if (!updated) {
        return res.status(404).json({
          message: "List not found or you don't have permission to update it"
        });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('List update error:', error);
      const message = error instanceof Error ? error.message : "Failed to update list";
      
      // Check if it's a validation error about companies
      if (message.includes('Invalid or unauthorized companies')) {
        res.status(400).json({ message });
      } else {
        res.status(500).json({ message });
      }
    }
  });

  app.use('/api/lists', router);
}