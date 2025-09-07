/**
 * Apollo.io Email Provider Module
 * 
 * Handles email discovery using Apollo.io API
 */

import { Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../utils";

export async function apolloSearch(req: Request, res: Response) {
  try {
    const contactId = parseInt(req.params.contactId);
    const userId = getUserId(req);
    console.log('Starting Apollo.io search for contact ID:', contactId);
    console.log('User ID:', userId);

    const contact = await storage.getContact(contactId, userId);
    if (!contact) {
      console.error('Contact not found in database for ID:', contactId);
      res.status(404).json({ message: "Contact not found" });
      return;
    }

    // Check if contact already has completed email search
    const { hasCompletedEmailSearch } = await import('../../lib/email-utils');
    if (hasCompletedEmailSearch(contact)) {
      console.log('Contact already has email, skipping Apollo search:', contact.email);
      res.json(contact);
      return;
    }
    console.log('Contact data from database:', {
      id: contact.id,
      name: contact.name,
      companyId: contact.companyId
    });

    const company = await storage.getCompany(contact.companyId, userId);
    if (!company) {
      console.error('Company not found in database for ID:', contact.companyId);
      res.status(404).json({ message: "Company not found" });
      return;
    }
    console.log('Company data from database:', {
      id: company.id,
      name: company.name
    });

    // Get the Apollo.io API key from environment variables
    const apolloApiKey = process.env.APOLLO_API_KEY;
    if (!apolloApiKey) {
      res.status(500).json({ message: "Apollo.io API key not configured" });
      return;
    }

    // Use enhanced orchestrator for better error handling and retries
    const { EnhancedSearchOrchestrator } = await import('./email-discovery/enhanced-search-orchestrator');
    const orchestrator = new EnhancedSearchOrchestrator();
    
    const searchResult = await orchestrator.executeApolloSearch(contact, company, apolloApiKey);
    
    if (searchResult.success) {
      // Handle email updates with unified deduplication logic - only include search result fields (no ID)
      const updateData: any = {
        completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
        lastValidated: new Date()
      };

      // Only update role if it exists
      if (searchResult.contact.role) {
        updateData.role = searchResult.contact.role;
      }
      
      // Only update email if one was found
      if (searchResult.contact.email) {
        const { mergeEmailData } = await import('../../lib/email-utils');
        const emailUpdates = mergeEmailData(contact, searchResult.contact.email);
        Object.assign(updateData, emailUpdates);
      }

      const updatedContact = await storage.updateContact(contactId, updateData, userId);
      console.log('Apollo search completed:', {
        success: true,
        emailFound: !!updatedContact?.email,
        confidence: searchResult.metadata.confidence
      });

      res.json(updatedContact);
    } else {
      // Update contact to mark search as completed even if failed - only include specific fields (no ID)
      const updateData = {
        completedSearches: [...(contact.completedSearches || []), 'apollo_search'],
        lastValidated: new Date()
      };
      
      const updatedContact = await storage.updateContact(contactId, updateData, userId);
      res.status(422).json({
        message: searchResult.metadata.error || "No email found",
        contact: updatedContact,
        searchMetadata: searchResult.metadata
      });
    }
  } catch (error) {
    console.error('Apollo.io search error:', error);
    // Send a more detailed error response
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to search Apollo.io",
      details: error instanceof Error ? error.stack : undefined
    });
  }
}