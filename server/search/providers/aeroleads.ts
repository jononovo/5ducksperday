/**
 * AeroLeads Email Provider Module
 * 
 * Handles email discovery using AeroLeads API
 */

import { Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../utils";

async function searchAeroLeadsDirect(
  name: string,
  company: string,
  apiKey: string
): Promise<{ email: string | null; confidence: number }> {
  try {
    const axios = (await import('axios')).default;
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');

    console.log(`Searching AeroLeads for: ${firstName} ${lastName} at ${company}`);

    const response = await axios.get('https://aeroleads.com/api/get_email_details', {
      params: {
        api_key: apiKey,
        first_name: firstName,
        last_name: lastName,
        company: company
      },
      timeout: 20000
    });

    console.log('AeroLeads API response:', response.data);

    // Handle both response formats AeroLeads uses
    if (response.data?.success && response.data?.data?.email) {
      return {
        email: response.data.data.email,
        confidence: response.data.data.score || 75
      };
    }

    if (response.data?.email) {
      console.log(`Found email in direct response format: ${response.data.email}`);
      return {
        email: response.data.email,
        confidence: 75
      };
    }

    console.log('No email found in AeroLeads response');
    return {
      email: null,
      confidence: 0
    };
  } catch (error: any) {
    console.error('AeroLeads API error:', error);
    if (error.response) {
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
    }
    return {
      email: null,
      confidence: 0
    };
  }
}

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

    // Direct AeroLeads API implementation
    console.log('Initiating AeroLeads search for:', {
      contactName: contact.name,
      companyName: company.name
    });

    const result = await searchAeroLeadsDirect(
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