import express, { Request, Response } from "express";
import { CreditService } from "./service";
import { SearchType } from "./types";

function requireAuth(req: Request, res: Response, next: express.NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
}

function getUserId(req: Request): number {
  return (req.user as any).id;
}

export function registerCreditRoutes(app: express.Express) {
  // Get user credit balance and status
  app.get("/api/credits", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        console.log("[Credits Route] Authentication failed");
        return res.status(401).json({ message: "Authentication required" });
      }

      const userId = (req.user as any).id;
      console.log(`[Credits Route] Processing request for user ${userId}`);
      
      const credits = await CreditService.getUserCredits(userId);
      console.log(`[Credits Route] Received credits from service:`, credits);

      const response = {
        balance: credits.currentBalance,
        isBlocked: credits.isBlocked,
        lastTopUp: credits.lastTopUp,
        totalUsed: credits.totalUsed,
        monthlyAllowance: credits.monthlyAllowance
      };
      
      console.log(`[Credits Route] Sending response for user ${userId}:`, response);
      res.json(response);
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

  // Deduct credits for individual email search
  app.post("/api/credits/deduct-individual-email", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { contactId, searchType, emailFound } = req.body;

      if (!contactId || !searchType || typeof emailFound !== 'boolean') {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      // Only deduct credits if email was found
      if (!emailFound) {
        res.json({ 
          success: true, 
          charged: false, 
          message: "No email found - no credits deducted" 
        });
        return;
      }

      // Validate search type
      const validSearchTypes = ['apollo', 'hunter', 'perplexity', 'comprehensive'];
      if (!validSearchTypes.includes(searchType)) {
        res.status(400).json({ message: "Invalid search type" });
        return;
      }

      // Deduct credits for successful email discovery
      const result = await CreditService.deductCredits(
        userId,
        'individual_email' as SearchType,
        true // success = true since email was found
      );

      console.log(`Individual email search billing: ${searchType} search for contact ${contactId} - charged ${result.success ? 20 : 0} credits`);

      res.json({
        success: result.success,
        charged: true,
        newBalance: result.newBalance,
        isBlocked: result.isBlocked,
        transaction: result.transaction,
        searchType,
        contactId
      });

    } catch (error) {
      console.error('Individual email credit deduction error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to process credit deduction",
        success: false,
        charged: false
      });
    }
  });
}