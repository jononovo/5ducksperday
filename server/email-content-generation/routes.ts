import type { Express } from "express";
import { generateEmailContent } from "./service";
import type { EmailGenerationRequest } from "./types";

export function registerEmailGenerationRoutes(app: Express, requireAuth: any) {
  app.post("/api/generate-email", requireAuth, async (req, res) => {
    const { emailPrompt, contact, company, tone, offerStrategy, generateTemplate, productContext } = req.body;

    if (!emailPrompt || !company) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    try {
      const userId = (req.user as any).id;
      
      const request: EmailGenerationRequest = {
        emailPrompt,
        contact: contact || null,
        company,
        userId,
        toEmail: req.body.toEmail,
        emailSubject: req.body.emailSubject,
        tone: tone || 'default',
        offerStrategy: offerStrategy || 'none',
        generateTemplate: generateTemplate || false,
        productContext: productContext || undefined // Pass product context to service
      };

      const result = await generateEmailContent(request);

      res.json(result);
    } catch (error) {
      console.error('Email generation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during email generation"
      });
    }
  });
}