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

export function registerBillingCreditRoutes(app: express.Express) {
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