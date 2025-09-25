import express from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('requireAdmin middleware check:', {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID || 'none',
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user ? (req.user as any).id : 'none',
    timestamp: new Date().toISOString()
  });

  if (!req.isAuthenticated()) {
    console.warn('Admin authentication required but user not authenticated:', {
      path: req.path,
      sessionID: req.sessionID || 'none',
      timestamp: new Date().toISOString()
    });
    res.status(401).json({ 
      message: "Authentication required",
      details: "Please log in to access admin resources"
    });
    return;
  }
  
  const userId = (req.user as any)?.id;
  if (!userId) {
    console.error('Authenticated user missing ID:', {
      hasUser: !!req.user,
      user: req.user,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: "Authentication error",
      details: "User session invalid"
    });
    return;
  }
  
  try {
    // Check if user is admin
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      console.error('User not found in database:', {
        userId,
        timestamp: new Date().toISOString()
      });
      res.status(403).json({ 
        message: "Access denied",
        details: "User not found"
      });
      return;
    }

    // Check if user has admin privileges - only rely on the database flag
    const isAdmin = (user as any).isAdmin === true;
    
    if (!isAdmin) {
      console.warn('Admin access denied for non-admin user:', {
        userId,
        email: user.email,
        timestamp: new Date().toISOString()
      });
      res.status(403).json({ 
        message: "Access denied",
        details: "Admin privileges required"
      });
      return;
    }
    
    console.log('Admin authentication successful:', {
      userId,
      email: user.email,
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    // Store admin status in request for later use
    (req as any).isAdmin = true;
    (req as any).adminUser = user;
    
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ 
      message: "Authorization error",
      details: "Failed to verify admin status"
    });
  }
}

// Helper function to check if a user is admin without requiring authentication
export async function isUserAdmin(userId: number): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return false;
    }

    // Check admin flag only - no email bypass
    return (user as any).isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status for user:', userId, error);
    return false;
  }
}