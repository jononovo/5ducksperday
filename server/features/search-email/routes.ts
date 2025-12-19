/**
 * Consolidated Email Search Module
 * 
 * Handles individual email search requests from the "Find Email" button.
 * Runs a waterfall search (Apollo → Perplexity → Hunter) and bills ONCE on success.
 * 
 * Note: This is separate from job-based email searches which are part of larger
 * search orchestration and have their own billing logic.
 */

import { Express, Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../../search/utils";
import { searchHunterDirect } from "../../search/providers/hunter";
import { searchApolloDirect } from "../../search/providers/apollo";
import { searchContactDetails } from "../../search/enrichment/contact-details";
import { CreditService } from "../billing/credits/service";
import type { Contact } from "@shared/schema";

export function registerSearchEmailRoutes(app: Express, requireAuth: any) {
  
  /**
   * Consolidated email search - single billing point for waterfall search
   * Called by the "Find Email" button on contact cards
   */
  app.post("/api/contacts/:contactId/consolidated-email-search", requireAuth, async (req: Request, res: Response) => {
    const contactId = parseInt(req.params.contactId);
    const userId = getUserId(req);
    const searchContext = req.body.searchContext;
    
    console.log(`[ConsolidatedSearch] Starting for contact ${contactId}`);
    
    try {
      // Get contact data
      const contact = await storage.getContact(contactId, userId);
      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      
      // Skip if already has email
      if (contact.email) {
        console.log(`[ConsolidatedSearch] Contact already has email: ${contact.email}`);
        res.json({ contact, emailFound: true, source: 'existing' });
        return;
      }
      
      // Get company data
      const company = await storage.getCompany(contact.companyId!, userId);
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }
      
      // PRE-SEARCH CREDIT CHECK (single check before waterfall)
      const creditCheck = await CreditService.getUserCredits(userId);
      if (creditCheck.isBlocked || creditCheck.currentBalance < 20) {
        res.status(402).json({ 
          message: "Insufficient credits for email search",
          balance: creditCheck.currentBalance,
          required: 20
        });
        return;
      }
      
      let emailFound = false;
      let updatedContact: Contact | null = null;
      let sourceProvider = '';
      
      // TIER 1: Apollo
      if (!contact.completedSearches?.includes('apollo_search')) {
        try {
          const apolloApiKey = process.env.APOLLO_API_KEY;
          if (apolloApiKey) {
            console.log(`[ConsolidatedSearch] Trying Apollo for ${contact.name}`);
            const apolloResult = await searchApolloDirect(contact, company, apolloApiKey);
            
            if (apolloResult.success && apolloResult.contact.email) {
              const { mergeEmailData } = await import('../../lib/email-utils');
              const emailUpdates = mergeEmailData(contact, apolloResult.contact.email);
              
              updatedContact = await storage.updateContact(contactId, {
                ...emailUpdates,
                role: apolloResult.contact.role || contact.role,
                linkedinUrl: apolloResult.contact.linkedinUrl || contact.linkedinUrl,
                completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
                lastValidated: new Date()
              });
              
              emailFound = !!(emailUpdates.email || (emailUpdates.alternativeEmails && emailUpdates.alternativeEmails.length > 0));
              if (emailFound) {
                sourceProvider = 'apollo';
              }
            } else {
              // Mark Apollo as completed even if no email found
              await storage.updateContact(contactId, {
                completedSearches: [...(contact.completedSearches || []), 'apollo_search']
              });
            }
          }
        } catch (error) {
          console.error(`[ConsolidatedSearch] Apollo error:`, error);
        }
      }
      
      // TIER 2: Perplexity (if Apollo didn't find email)
      if (!emailFound && !contact.completedSearches?.includes('contact_enrichment')) {
        try {
          console.log(`[ConsolidatedSearch] Trying Perplexity for ${contact.name}`);
          const perplexityResult = await searchContactDetails(contact.name, company.name);
          
          if (perplexityResult.email) {
            const { mergeEmailData } = await import('../../lib/email-utils');
            const emailUpdates = mergeEmailData(contact, perplexityResult.email);
            
            updatedContact = await storage.updateContact(contactId, {
              ...emailUpdates,
              linkedinUrl: perplexityResult.linkedinUrl || contact.linkedinUrl,
              completedSearches: [...(contact.completedSearches || []), 'contact_enrichment'],
              lastValidated: new Date()
            });
            
            emailFound = !!(emailUpdates.email || (emailUpdates.alternativeEmails && emailUpdates.alternativeEmails.length > 0));
            if (emailFound) {
              sourceProvider = 'perplexity';
            }
          } else {
            // Mark Perplexity as completed even if no email found
            await storage.updateContact(contactId, {
              completedSearches: [...(contact.completedSearches || []), 'contact_enrichment']
            });
          }
        } catch (error) {
          console.error(`[ConsolidatedSearch] Perplexity error:`, error);
        }
      }
      
      // TIER 3: Hunter (if still no email)
      if (!emailFound && !contact.completedSearches?.includes('hunter_search')) {
        try {
          const hunterApiKey = process.env.HUNTER_API_KEY;
          if (hunterApiKey) {
            console.log(`[ConsolidatedSearch] Trying Hunter for ${contact.name}`);
            const hunterResult = await searchHunterDirect(contact, company, hunterApiKey);
            
            if (hunterResult.success && hunterResult.contact.email) {
              const { mergeEmailData } = await import('../../lib/email-utils');
              const emailUpdates = mergeEmailData(contact, hunterResult.contact.email);
              
              updatedContact = await storage.updateContact(contactId, {
                ...emailUpdates,
                role: hunterResult.contact.role || contact.role,
                completedSearches: [...(contact.completedSearches || []), 'hunter_search'],
                lastValidated: new Date()
              });
              
              emailFound = !!(emailUpdates.email || (emailUpdates.alternativeEmails && emailUpdates.alternativeEmails.length > 0));
              if (emailFound) {
                sourceProvider = 'hunter';
              }
            } else {
              // Mark Hunter as completed even if no email found
              await storage.updateContact(contactId, {
                completedSearches: [...(contact.completedSearches || []), 'hunter_search']
              });
            }
          }
        } catch (error) {
          console.error(`[ConsolidatedSearch] Hunter error:`, error);
        }
      }
      
      // BILLING: Deduct credits ONCE if email was found by ANY provider
      if (emailFound && updatedContact) {
        await CreditService.deductCredits(userId, 'individual_email', true);
        console.log(`[ConsolidatedSearch] Deducted 20 credits for email found via ${sourceProvider}`);
        
        res.json({ 
          contact: updatedContact, 
          emailFound: true, 
          source: sourceProvider 
        });
        return;
      }
      
      // NO EMAIL FOUND - mark comprehensive search as complete
      const currentContact = await storage.getContact(contactId, userId);
      if (!currentContact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      
      const completedSearches = currentContact.completedSearches || [];
      if (!completedSearches.includes('comprehensive_search')) {
        completedSearches.push('comprehensive_search');
        
        // Apply -1 point penalty since no email found
        const newProbability = Math.max(0, (currentContact.probability || 0) - 1);
        
        const updated = await storage.updateContact(contactId, {
          probability: newProbability,
          completedSearches: completedSearches,
          lastValidated: new Date()
        });
        
        console.log(`[ConsolidatedSearch] No email found for ${contact.name}. All sources exhausted.`);
        res.json({ 
          contact: updated || currentContact, 
          emailFound: false, 
          source: null 
        });
        return;
      }
      
      // Already marked as comprehensive search - return current contact
      console.log(`[ConsolidatedSearch] Contact ${contact.name} already has comprehensive_search marked.`);
      res.json({ 
        contact: currentContact, 
        emailFound: false, 
        source: null 
      });
      
    } catch (error) {
      console.error('[ConsolidatedSearch] Error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to search for email"
      });
    }
  });
  
  /**
   * Mark comprehensive search as complete (even if no email was found)
   * Legacy endpoint - kept for backward compatibility
   */
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
      // Apply -1 point penalty only if no email found and not already marked
      const completedSearches = contact.completedSearches || [];
      if (!completedSearches.includes('comprehensive_search')) {
        completedSearches.push('comprehensive_search');
        
        // Apply -1 point penalty since comprehensive search found no email
        const newProbability = Math.max(0, (contact.probability || 0) - 1);
        
        const updatedContact = await storage.updateContact(contactId, {
          probability: newProbability,
          completedSearches: completedSearches,
          lastValidated: new Date()
        });
        
        console.log(`[ComprehensiveSearch] Marked ${contact.name} as comprehensively searched (no email found). Score: ${contact.probability || 0} → ${newProbability}`);
        
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
