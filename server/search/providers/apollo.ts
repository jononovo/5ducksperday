/**
 * Apollo.io Email Provider Module
 * 
 * Handles email discovery using Apollo.io API
 */

import { Request, Response } from "express";
import { storage } from "../../storage";
import { getUserId } from "../utils";

export async function searchApolloDirect(contact: any, company: any, apiKey: string): Promise<any> {
  try {
    const axios = (await import('axios')).default;
    const response = await axios.post('https://api.apollo.io/v1/people/match', {
      name: contact.name,
      organization_name: company.name,
      domain: company.website
    }, {
      headers: {
        'X-Api-Key': apiKey
      },
      timeout: 20000
    });

    if (response.data?.person?.email) {
      return {
        success: true,
        contact: {
          ...contact,
          email: response.data.person.email,
          role: response.data.person.title || contact.role,
          linkedinUrl: response.data.person.linkedin_url || contact.linkedinUrl,
          phoneNumber: response.data.person.phone_numbers?.[0]?.sanitized_number || contact.phoneNumber
        },
        metadata: {
          confidence: response.data.person.email_confidence || 75,
          searchDate: new Date().toISOString()
        }
      };
    }

    return {
      success: false,
      contact,
      metadata: {
        error: 'No email found',
        searchDate: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Apollo API error:', error);
    return {
      success: false,
      contact,
      metadata: {
        error: error instanceof Error ? error.message : 'Apollo API failed',
        searchDate: new Date().toISOString()
      }
    };
  }
}

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

    // Direct Apollo API implementation
    const searchResult = await searchApolloDirect(contact, company, apolloApiKey);
    
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

      const updatedContact = await storage.updateContact(contactId, updateData);
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
      
      const updatedContact = await storage.updateContact(contactId, updateData);
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