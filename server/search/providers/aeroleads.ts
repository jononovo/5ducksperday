/**
 * AeroLeads Email Provider Module
 * 
 * Handles email discovery using AeroLeads API
 */

import { Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../utils";

export async function aeroLeadsSearch(req: Request, res: Response) {
  try {
    const contactId = parseInt(req.params.contactId);
    const userId = getUserId(req);
    console.log('Starting AeroLeads search for contact ID:', contactId);
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
      console.log('Contact already has email, skipping AeroLeads search:', contact.email);
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

    // Get the AeroLeads API key from environment variables
    const aeroLeadsApiKey = process.env.AEROLEADS_API_KEY;
    if (!aeroLeadsApiKey) {
      res.status(500).json({ message: "AeroLeads API key not configured" });
      return;
    }

    // Use the AeroLeads API to search for the email
    const { searchAeroLeads } = await import('../../lib/search-logic/email-discovery/aeroleads-search');
    console.log('Initiating AeroLeads search for:', {
      contactName: contact.name,
      companyName: company.name
    });

    const result = await searchAeroLeads(
      contact.name,
      company.name,
      aeroLeadsApiKey
    );

    console.log('AeroLeads search result:', result);

    // Update the contact with the results - only include fields that need updating
    const updateData: any = {
      completedSearches: [...(contact.completedSearches || []), 'aeroleads_search'],
      lastValidated: new Date()
    };
    
    // Handle email updates with unified deduplication logic
    if (result.email) {
      console.log('Processing AeroLeads search email result:', {
        newEmail: result.email,
        existingEmail: contact.email,
        alternativeEmails: contact.alternativeEmails,
        contactId: contact.id
      });
      
      const { mergeEmailData } = await import('../../lib/email-utils');
      const emailUpdates = mergeEmailData(contact, result.email);
      Object.assign(updateData, emailUpdates);
      
      if (emailUpdates.email) {
        console.log('Setting as primary email:', result.email);
      } else if (emailUpdates.alternativeEmails) {
        console.log('Updated alternative emails:', emailUpdates.alternativeEmails);
      }
      updateData.nameConfidenceScore = result.confidence;
    }
    
    const updatedContact = await storage.updateContact(contactId, updateData);

    console.log('Contact updated with AeroLeads result:', {
      id: updatedContact?.id,
      email: updatedContact?.email,
      confidence: updatedContact?.nameConfidenceScore
    });

    res.json(updatedContact);
  } catch (error) {
    console.error('AeroLeads search error:', error);
    // Send a more detailed error response
    res.status(500).json({
      message: error instanceof Error ? error.message : "Failed to search AeroLeads",
      details: error instanceof Error ? error.stack : undefined
    });
  }
}