import { storage } from "../../../storage";
import { searchContactDetails } from "../../api-interactions";
import { EmailEnrichmentQueue } from "./email-enrichment-queue";
import type { Contact } from "@shared/schema";

export class EmailEnrichmentService {
  private queue: EmailEnrichmentQueue;

  constructor() {
    this.queue = new EmailEnrichmentQueue();
  }

  async enrichContact(contactId: number): Promise<Contact | undefined> {
    try {
      const contact = await storage.getContact(contactId);
      if (!contact) {
        throw new Error(`Contact not found: ${contactId}`);
      }

      const company = await storage.getCompany(contact.companyId);
      if (!company) {
        throw new Error(`Company not found for contact: ${contactId}`);
      }

      const enrichedDetails = await searchContactDetails(contact.name, company.name);

      return storage.updateContact(contactId, {
        ...contact,
        email: enrichedDetails.email || contact.email,
        linkedinUrl: enrichedDetails.linkedinUrl || contact.linkedinUrl,
        twitterHandle: enrichedDetails.twitterHandle || contact.twitterHandle,
        phoneNumber: enrichedDetails.phoneNumber || contact.phoneNumber,
        department: enrichedDetails.department || contact.department,
        location: enrichedDetails.location || contact.location,
        completedSearches: [...(contact.completedSearches || []), 'contact_enrichment']
      });
    } catch (error) {
      console.error(`Failed to enrich contact ${contactId}:`, error);
      throw error;
    }
  }

  async enrichTopProspects(companyId: number): Promise<void> {
    try {
      const contacts = await storage.listContactsByCompany(companyId);
      const topProspects = contacts
        .filter(contact => contact.probability && contact.probability >= 50)
        .sort((a, b) => (b.probability || 0) - (a.probability || 0))
        .slice(0, 10);

      for (const contact of topProspects) {
        await this.queue.enqueue(contact.id);
      }

      // Start processing the queue
      this.queue.processQueue(this.enrichContact.bind(this));
    } catch (error) {
      console.error(`Failed to enrich top prospects for company ${companyId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const emailEnrichmentService = new EmailEnrichmentService();
