/**
 * Contact Discovery Module
 * 
 * Handles all contact-related search operations including discovery,
 * enrichment, and marking searches as complete.
 */

import { Express, Request, Response } from "express";
import { storage } from "../storage";
import { getUserId } from "./utils";
import { hunterSearch } from "./providers/hunter";
import { apolloSearch } from "./providers/apollo";
import { aeroLeadsSearch } from "./providers/aeroleads";
import type { Contact } from "./types";

export function registerContactRoutes(app: Express, requireAuth: any) {
  
  // Hunter.io email finder endpoint
  app.post("/api/contacts/:contactId/hunter", requireAuth, hunterSearch);
  
  // Apollo.io email finder endpoint
  app.post("/api/contacts/:contactId/apollo", requireAuth, apolloSearch);
  
  // AeroLeads email finder endpoint
  app.post("/api/contacts/:contactId/aeroleads", requireAuth, aeroLeadsSearch);
  
  // Mark comprehensive search as complete (even if no email was found)
  app.post("/api/contacts/:contactId/comprehensive-search-complete", requireAuth, async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const userId = getUserId(req);
      
      const contact = await storage.getContact(contactId, userId);
      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }

      // Add 'comprehensive_search' to completedSearches array if not already there
      const completedSearches = contact.completedSearches || [];
      if (!completedSearches.includes('comprehensive_search')) {
        completedSearches.push('comprehensive_search');
        
        const updatedContact = await storage.updateContact(contactId, {
          completedSearches: completedSearches,
          lastValidated: new Date()
        }, userId);
        
        res.json(updatedContact);
      } else {
        res.json(contact);
      }
    } catch (error) {
      console.error('Error marking comprehensive search as complete:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to mark search as complete"
      });
    }
  });
}