import { Express } from "express";
import { z } from "zod";
import { sendEmail } from "../../email/send";
import { requireAuth, getUserId } from "../../utils/auth";
import { storage } from "../../storage";

const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "billing", "technical", "general"]),
  message: z.string().min(1, "Message is required"),
});

const feedbackTypeLabels: Record<string, string> = {
  bug: "Bug Report",
  feature: "Feature Request",
  billing: "Billing Question",
  technical: "Technical Support",
  general: "General Feedback",
};

export function registerFeedbackRoutes(app: Express) {
  app.post("/api/feedback", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const result = feedbackSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.flatten().fieldErrors 
        });
      }

      const { type, message } = result.data;

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userName = user.username || "Unknown User";
      const userEmail = user.email;
      const signupDate = user.createdAt 
        ? new Date(user.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "Unknown";

      const typeLabel = feedbackTypeLabels[type] || type;
      const subject = `[${typeLabel}] Feedback from ${userName}`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
            ${typeLabel}
          </h2>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>From:</strong> ${userName}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
            <p style="margin: 5px 0;"><strong>Member since:</strong> ${signupDate}</p>
            <p style="margin: 5px 0;"><strong>User ID:</strong> ${userId}</p>
          </div>
          
          <div style="background: #fff; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h3 style="color: #555; margin-top: 0;">Message:</h3>
            <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">${message}</p>
          </div>
          
          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            Reply directly to this email to respond to ${userName}.
          </p>
        </div>
      `;

      const textContent = `
${typeLabel}
${"=".repeat(typeLabel.length)}

From: ${userName}
Email: ${userEmail}
Member since: ${signupDate}
User ID: ${userId}

Message:
${message}

---
Reply directly to this email to respond to ${userName}.
      `.trim();

      await sendEmail({
        to: "support@5ducks.ai",
        replyTo: userEmail,
        fromName: "5Ducks Feedback",
        content: {
          subject,
          html: htmlContent,
          text: textContent,
        },
      });

      console.log(`[Feedback] Sent ${type} feedback from user ${userId} (${userEmail})`);

      res.json({ success: true, message: "Feedback sent successfully" });
    } catch (error: any) {
      console.error("[Feedback] Error sending feedback:", error);
      res.status(500).json({ 
        message: "Failed to send feedback. Please try again later." 
      });
    }
  });
}
