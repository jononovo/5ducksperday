import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { insertAccessApplicationSchema } from "@shared/schema";
import { dripEmailEngine } from "../../email/drip-engine";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const parseResult = insertAccessApplicationSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: "Invalid input", 
        details: parseResult.error.flatten().fieldErrors 
      });
    }
    
    const { name, email } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    
    const existing = await storage.getAccessApplicationByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ 
        error: "You've already applied! Check your email for confirmation." 
      });
    }
    
    const application = await storage.createAccessApplication({
      name: name.trim(),
      email: normalizedEmail
    });
    
    try {
      await dripEmailEngine.enrollInSequence(
        'Access Application Sequence',
        normalizedEmail,
        name.trim(),
        { applicationId: application.id }
      );
      console.log(`Enrolled ${normalizedEmail} in Access Application Sequence`);
    } catch (enrollError: any) {
      console.error('Drip sequence enrollment error:', enrollError);
    }
    
    return res.status(201).json({ 
      success: true,
      message: "Application received! Check your email for confirmation.",
      applicationId: application.id
    });
    
  } catch (error) {
    console.error('Access application error:', error);
    return res.status(500).json({ error: "Failed to submit application" });
  }
});

export function registerAccessApplicationsRoutes(app: Router) {
  app.use("/api/access-applications", router);
}
