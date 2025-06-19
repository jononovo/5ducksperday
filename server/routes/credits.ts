import type { Express } from "express";
import { CreditService } from "../lib/credits";
import { SearchType } from "../lib/credits/types";

export function registerCreditRoutes(app: Express) {
  // Get user credit balance and status
  app.get("/api/credits", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.user.id;
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
      res.status(500).json({ error: "Failed to fetch credits" });
    }
  });

  // Get credit transaction history
  app.get("/api/credits/history", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await CreditService.getCreditHistory(userId, limit);
      
      res.json({ transactions: history });
    } catch (error) {
      console.error("Error fetching credit history:", error);
      res.status(500).json({ error: "Failed to fetch credit history" });
    }
  });

  // Get usage statistics
  app.get("/api/credits/stats", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.user.id;
      const stats = await CreditService.getUsageStats(userId);
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  // Check if user is blocked
  app.get("/api/credits/blocked", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userId = req.user.id;
      const isBlocked = await CreditService.isUserBlocked(userId);
      
      res.json({ isBlocked });
    } catch (error) {
      console.error("Error checking block status:", error);
      res.status(500).json({ error: "Failed to check block status" });
    }
  });

  // Manual credit adjustment (admin only - would need proper auth)
  app.post("/api/credits/adjust", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // TODO: Add admin role check here
      const { amount, description } = req.body;
      const userId = req.user.id;

      if (typeof amount !== 'number' || !description) {
        return res.status(400).json({ error: "Amount and description required" });
      }

      const result = await CreditService.adjustCredits(userId, amount, description);
      
      res.json(result);
    } catch (error) {
      console.error("Error adjusting credits:", error);
      res.status(500).json({ error: "Failed to adjust credits" });
    }
  });
}