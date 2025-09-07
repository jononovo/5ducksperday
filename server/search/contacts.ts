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
import { searchContactDetails } from "./enrichment/contact-details";
import { CreditService } from "../lib/credits";
import type { Contact } from "@shared/schema";

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
        });
        
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

  // Get a single contact by ID
  app.get("/api/contacts/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      console.log('GET /api/contacts/:id - Request params:', {
        id: req.params.id,
        userId: userId
      });

      const contact = await storage.getContact(parseInt(req.params.id), userId);

      console.log('GET /api/contacts/:id - Retrieved contact:', {
        requested: req.params.id,
        found: contact ? { id: contact.id, name: contact.name } : null
      });

      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      res.json(contact);
    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  // Search for contact details
  app.post("/api/contacts/search", requireAuth, async (req: Request, res: Response) => {
    const { name, company } = req.body;

    if (!name || !company) {
      res.status(400).json({
        message: "Both name and company are required"
      });
      return;
    }

    try {
      const contactDetails = await searchContactDetails(name, company);

      if (Object.keys(contactDetails).length === 0) {
        res.status(404).json({
          message: "No additional contact details found"
        });
        return;
      }

      res.json(contactDetails);
    } catch (error) {
      console.error('Contact search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during contact search"
      });
    }
  });

  // Enrich contact with Perplexity
  app.post("/api/contacts/:contactId/enrich", requireAuth, async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const userId = getUserId(req);
      console.log('Starting Perplexity enrichment for contact:', contactId);
      console.log('User ID:', userId);

      // PRE-SEARCH CREDIT CHECK (same as other APIs)
      const creditCheck = await CreditService.getUserCredits(userId);
      if (creditCheck.isBlocked || creditCheck.currentBalance < 20) {
        res.status(402).json({ 
          message: "Insufficient credits for individual email search",
          balance: creditCheck.currentBalance,
          required: 20
        });
        return;
      }

      const contact = await storage.getContact(contactId, userId);
      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      console.log('Contact data from database:', { id: contact.id, name: contact.name, companyId: contact.companyId });

      const company = await storage.getCompany(contact.companyId, userId);
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }
      console.log('Company data from database:', { id: company.id, name: company.name });

      // EXECUTE SEARCH (unchanged)
      console.log('Searching for contact details...');
      const enrichedDetails = await searchContactDetails(contact.name, company.name);
      console.log('Enriched details found:', enrichedDetails);

      // UPDATE CONTACT (unchanged)
      const updateData: any = {
        ...contact,
        linkedinUrl: enrichedDetails.linkedinUrl || contact.linkedinUrl,
        twitterHandle: enrichedDetails.twitterHandle || contact.twitterHandle,
        phoneNumber: enrichedDetails.phoneNumber || contact.phoneNumber,
        department: enrichedDetails.department || contact.department,
        location: enrichedDetails.location || contact.location,
        completedSearches: [...(contact.completedSearches || []), 'contact_enrichment']
      };
      
      // Handle email updates with billing detection
      let emailFound = false;
      if (enrichedDetails.email) {
        console.log('Processing Perplexity search email result:', {
          newEmail: enrichedDetails.email,
          existingEmail: contact.email,
          alternativeEmails: contact.alternativeEmails,
          contactId: contact.id
        });
        
        const { mergeEmailData } = await import('../lib/email-utils');
        const emailUpdates = mergeEmailData(contact, enrichedDetails.email);
        Object.assign(updateData, emailUpdates);
        
        // DETECT EMAIL SUCCESS (same logic as other APIs)
        emailFound = !!(emailUpdates.email || (emailUpdates.alternativeEmails && emailUpdates.alternativeEmails.length > 0));
        
        if (emailUpdates.email) {
          console.log('Setting as primary email:', enrichedDetails.email);
        } else if (emailUpdates.alternativeEmails) {
          console.log('Updated alternative emails:', emailUpdates.alternativeEmails);
        }
      }
      
      const updatedContact = await storage.updateContact(contactId, updateData);
      console.log('Perplexity search completed:', {
        success: true,
        emailFound: !!updatedContact?.email,
        contactId
      });

      res.json(updatedContact);
    } catch (error) {
      console.error('Perplexity contact enrichment error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during contact enrichment"
      });
    }
  });

  // Get contacts by company ID
  app.get("/api/companies/:companyId/contacts", async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const companyId = parseInt(req.params.companyId);
      
      // Handle cache invalidation for fresh data requests
      const cacheTimestamp = req.query.t;
      
      const contacts = await storage.listContactsByCompany(companyId, userId);
      
      // Set no-cache headers for fresh data requests
      if (cacheTimestamp) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts by company:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
}