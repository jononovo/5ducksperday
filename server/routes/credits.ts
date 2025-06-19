import express, { Request, Response } from "express";
import { CreditService } from "../lib/credits";

export function registerCreditRoutes(app: express.Express) {
  // Get user credit balance and status
  app.get("/api/credits", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const credits = await CreditService.getUserCredits(userId);

      res.json({
        balance: credits.currentBalance,
        isBlocked: credits.isBlocked,
        lastTopUp: credits.lastTopUp,
        totalUsed: credits.totalUsed,
        monthlyAllowance: credits.monthlyAllowance
      });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ 
        message: "Failed to fetch credit information",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get credit transaction history
  app.get("/api/credits/history", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await CreditService.getCreditHistory(userId, limit);

      res.json(history);
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ 
        message: "Failed to fetch credit history",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get usage statistics
  app.get("/api/credits/stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const stats = await CreditService.getUsageStats(userId);

      res.json(stats);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ 
        message: "Failed to fetch usage statistics",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Check if user is blocked
  app.get("/api/credits/status", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      const isBlocked = await CreditService.isUserBlocked(userId);

      res.json({ isBlocked });
    } catch (error) {
      console.error("Error checking credit status:", error);
      res.status(500).json({ 
        message: "Failed to check credit status",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Manual credit adjustment (admin only - for future use)
  app.post("/api/credits/adjust", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // For now, allow any authenticated user to adjust their own credits
      // In production, this should be admin-only
      const userId = (req.user as any).id;
      const { amount, description } = req.body;

      if (typeof amount !== 'number' || !description) {
        return res.status(400).json({ message: "Amount and description are required" });
      }

      const result = await CreditService.adjustCredits(userId, amount, description);

      res.json(result);
    } catch (error) {
      console.error("Error adjusting credits:", error);
      res.status(500).json({ 
        message: "Failed to adjust credits",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
}