import express, { Request, Response } from "express";
import { GamificationService } from "./service";

function defaultRequireAuth(req: Request, res: Response, next: express.NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function getUserId(req: Request): number {
  return (req.user as any).id;
}

export function registerGamificationRoutes(app: express.Express, requireAuth?: express.RequestHandler) {
  const authMiddleware = requireAuth || defaultRequireAuth;
  
  // Easter egg claim endpoint
  app.post('/api/credits/easter-egg', authMiddleware, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { query } = req.body;
      
      const result = await GamificationService.claimEasterEgg(userId, query);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(409).json(result);
      }
    } catch (error) {
      res.status(500).json({ message: "Easter egg claim failed" });
    }
  });
}
