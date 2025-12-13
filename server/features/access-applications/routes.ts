import { Router, Request, Response } from "express";
import { storage } from "../../storage";
import { insertAccessApplicationSchema } from "@shared/schema";
import { MailService } from "@sendgrid/mail";
import { buildApplicationConfirmationEmail } from "./email-template";

const router = Router();

const sendGridService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  sendGridService.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'quack@5ducks.ai';
const FROM_NAME = 'Jon @ 5Ducks';
const APP_URL = process.env.APP_URL || 'https://5ducks.ai';

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
    
    if (process.env.SENDGRID_API_KEY) {
      try {
        const emailContent = buildApplicationConfirmationEmail(name, APP_URL);
        
        await sendGridService.send({
          to: normalizedEmail,
          from: {
            email: FROM_EMAIL,
            name: FROM_NAME
          },
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true }
          }
        });
        
        console.log(`Application confirmation email sent to ${normalizedEmail}`);
      } catch (emailError: any) {
        console.error('SendGrid email error:', emailError);
        if (emailError.response?.body) {
          console.error('SendGrid error details:', JSON.stringify(emailError.response.body, null, 2));
        }
      }
    } else {
      console.warn('SENDGRID_API_KEY not configured, skipping confirmation email');
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
