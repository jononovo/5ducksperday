import { Express } from "express";
import { z } from "zod";
import { requireAuth, getUserId } from "../../utils/auth";
import { storage } from "../../storage";

const contactFeedbackSchema = z.object({
  feedbackType: z.enum(["excellent", "terrible"]),
  ispContext: z.string().min(1, "Please provide context for your feedback"),
});

export function registerFindIdealCustomerRoutes(app: Express) {
  app.post("/api/contacts/:contactId/feedback", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contactId = parseInt(req.params.contactId, 10);
      if (isNaN(contactId)) {
        return res.status(400).json({ message: "Invalid contact ID" });
      }

      const contact = await storage.getContact(contactId, userId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      if (contact.feedbackType) {
        return res.status(400).json({ message: "Feedback already given for this contact" });
      }

      const result = contactFeedbackSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: result.error.flatten().fieldErrors 
        });
      }

      const { feedbackType, ispContext } = result.data;

      const updatedContact = await storage.updateContact(contactId, {
        feedbackType,
        ispContext,
        feedbackAt: new Date(),
      });

      console.log(`[FindIdealCustomer] Contact ${contactId} feedback: ${feedbackType} from user ${userId}`);

      res.json({
        contactId: updatedContact.id,
        feedbackType: updatedContact.feedbackType,
        ispContext: updatedContact.ispContext,
        feedbackAt: updatedContact.feedbackAt,
      });
    } catch (error: any) {
      console.error("[FindIdealCustomer] Error saving contact feedback:", error);
      res.status(500).json({ 
        message: "Failed to save feedback. Please try again later." 
      });
    }
  });
}
