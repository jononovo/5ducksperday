import { Request, Response, Application } from 'express';
import { storage } from '../../storage';
import { insertContactListSchema, type Company } from '@shared/schema';
import { z } from 'zod';

function getUserId(req: Request): number {
  return (req as any).user?.id;
}

export function registerContactListRoutes(app: Application, requireAuth: any) {
  // Get all contacts for a user
  app.get('/api/contacts', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const contacts = await storage.listContacts(userId);
      res.json({
        total: contacts.length,
        contacts: contacts
      });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch contacts' 
      });
    }
  });

  // Bulk fetch contacts by IDs
  app.get('/api/contacts/bulk', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { ids } = req.query;
      
      if (!ids) {
        return res.json([]);
      }
      
      // Parse comma-separated IDs and filter out invalid ones
      const contactIds = String(ids)
        .split(',')
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
      
      if (contactIds.length === 0) {
        return res.json([]);
      }
      
      // Fetch contacts using the existing storage method
      const contacts = await storage.getContactsByIds(contactIds, userId);
      
      // Return plain array of contacts
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts by IDs:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch contacts' 
      });
    }
  });

  // List all contact lists for a user
  app.get('/api/contact-lists', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const lists = await storage.listContactLists(userId);
      res.json(lists);
    } catch (error) {
      console.error('Error fetching contact lists:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch contact lists' 
      });
    }
  });

  // Get specific contact list
  app.get('/api/contact-lists/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      const list = await storage.getContactList(listId, userId);
      
      if (!list) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      res.json(list);
    } catch (error) {
      console.error('Error fetching contact list:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch contact list' 
      });
    }
  });

  // Get contacts in a list
  app.get('/api/contact-lists/:id/contacts', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      // Verify list belongs to user
      const list = await storage.getContactList(listId, userId);
      if (!list) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      const contacts = await storage.listContactsByListId(listId);
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching list contacts:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to fetch list contacts' 
      });
    }
  });

  // Create new contact list
  app.post('/api/contact-lists', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      
      const parseResult = insertContactListSchema.safeParse({
        ...req.body,
        userId
      });
      
      if (!parseResult.success) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: parseResult.error.errors
        });
      }
      
      const list = await storage.createContactList(parseResult.data);
      res.status(201).json(list);
      
    } catch (error) {
      console.error('Error creating contact list:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create contact list' 
      });
    }
  });

  // Update contact list
  app.put('/api/contact-lists/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      // Verify list belongs to user
      const existingList = await storage.getContactList(listId, userId);
      if (!existingList) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      const { name, description } = req.body;
      
      const updated = await storage.updateContactList(listId, {
        name: name || existingList.name,
        description: description !== undefined ? description : existingList.description
      });
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating contact list:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to update contact list' 
      });
    }
  });

  // Delete contact list
  app.delete('/api/contact-lists/:id', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      await storage.deleteContactList(listId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting contact list:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to delete contact list' 
      });
    }
  });

  // Add contacts to list
  app.post('/api/contact-lists/:id/contacts', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      // Verify list belongs to user
      const list = await storage.getContactList(listId, userId);
      if (!list) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      const { contactIds, source = 'manual', sourceMetadata } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'contactIds must be a non-empty array' });
      }
      
      // Validate contact IDs are numbers
      if (!contactIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: 'All contact IDs must be numbers' });
      }
      
      const result = await storage.addContactsToList(listId, contactIds, source, userId, sourceMetadata);
      
      // Return the counts for the report dialog
      res.json(result);
    } catch (error) {
      console.error('Error adding contacts to list:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to add contacts to list' 
      });
    }
  });

  // Remove contacts from list
  app.delete('/api/contact-lists/:id/contacts', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      // Verify list belongs to user
      const list = await storage.getContactList(listId, userId);
      if (!list) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      const { contactIds } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: 'contactIds must be a non-empty array' });
      }
      
      // Validate contact IDs are numbers
      if (!contactIds.every(id => typeof id === 'number')) {
        return res.status(400).json({ message: 'All contact IDs must be numbers' });
      }
      
      await storage.removeContactsFromList(listId, contactIds);
      
      // Return updated list with new contact count
      const updatedList = await storage.getContactList(listId, userId);
      res.json(updatedList);
    } catch (error) {
      console.error('Error removing contacts from list:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to remove contacts from list' 
      });
    }
  });

  // Add contacts from a search list
  app.post('/api/contact-lists/:id/add-from-search-list', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      const { searchListId } = req.body;
      
      if (isNaN(listId) || isNaN(searchListId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      // Verify contact list belongs to user
      const contactList = await storage.getContactList(listId, userId);
      if (!contactList) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      // Get all companies from the search list
      let companies = await storage.listCompaniesBySearchList(searchListId, userId);
      console.log(`Found ${companies.length} companies in search list ${searchListId} (with listId field)`);
      
      // If no companies found, try a fallback approach
      if (companies.length === 0) {
        console.log('No companies with listId found, trying fallback approach...');
        
        // Get the list details to see when it was created
        const searchList = await storage.getSearchList(searchListId, userId);
        if (searchList) {
          // Get all companies for the user
          const allUserCompanies = await storage.listCompanies(userId);
          
          // Filter companies that were created around the same time as the list
          // (within 5 minutes before or after list creation)
          const listCreatedAt = new Date(searchList.createdAt || 0).getTime();
          const timeWindow = 5 * 60 * 1000; // 5 minutes
          
          companies = allUserCompanies.filter(company => {
            const companyCreatedAt = new Date(company.createdAt || 0).getTime();
            return Math.abs(companyCreatedAt - listCreatedAt) <= timeWindow;
          });
          
          console.log(`Found ${companies.length} companies created around the same time as list ${searchListId}`);
        }
      }
      
      // Collect all contact IDs from those companies
      const allContactIds = new Set<number>();
      
      for (const company of companies) {
        // Get contacts that are directly linked to this company
        const contacts = await storage.listContactsByCompany(company.id, userId);
        contacts.forEach(c => allContactIds.add(c.id));
      }
      
      // If we still don't have contacts, try to get all contacts for this user 
      // that match the companies by name
      if (allContactIds.size === 0 && companies.length > 0) {
        console.log('No directly linked contacts found, searching by company names...');
        
        // Get all contacts for the user
        const userContacts = await storage.listContacts(userId);
        
        // Create a map of company names for quick lookup
        const companyNames = new Set(companies.map(c => c.name?.toLowerCase()).filter(Boolean));
        const companyDomains = new Set(companies.map(c => {
          if (c.website) {
            try {
              const url = new URL(c.website.startsWith('http') ? c.website : `https://${c.website}`);
              return url.hostname.replace('www.', '').toLowerCase();
            } catch {
              return null;
            }
          }
          return null;
        }).filter(Boolean));
        
        // Match contacts to companies by company name or domain in email
        for (const contact of userContacts) {
          // Check if contact's company ID matches any of our companies
          if (contact.companyId && companies.some(c => c.id === contact.companyId)) {
            allContactIds.add(contact.id);
            continue;
          }
          
          // Check by email domain
          if (contact.email) {
            const emailDomain = contact.email.split('@')[1]?.toLowerCase();
            if (emailDomain && companyDomains.has(emailDomain)) {
              allContactIds.add(contact.id);
            }
          }
        }
        
        console.log(`Found ${allContactIds.size} contacts by matching company names/domains`);
      }
      
      const contactIds = Array.from(allContactIds);
      
      if (contactIds.length > 0) {
        await storage.addContactsToList(listId, contactIds, 'search_list', userId, { searchListId });
        console.log(`Successfully added ${contactIds.length} contacts to list ${listId}`);
      } else {
        console.log('No contacts found to add from search list');
      }
      
      // Return updated list
      const updatedList = await storage.getContactList(listId, userId);
      res.json({
        ...updatedList,
        added: contactIds.length
      });
    } catch (error) {
      console.error('Error adding contacts from search list:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to add contacts from search list' 
      });
    }
  });

  // Create contact list from search results
  app.post('/api/contact-lists/from-search', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const { searchListIds, currentListId, currentQuery } = req.body;
      
      // Create the contact list with appropriate name
      let listName = 'Campaign List';
      let description = '';
      
      if (currentListId && currentQuery) {
        listName = `Campaign: ${currentQuery}`;
        description = `Contacts from search: "${currentQuery}"`;
      } else if (searchListIds && searchListIds.length > 0) {
        listName = `Campaign: ${searchListIds.length} search lists`;
        description = `Combined contacts from ${searchListIds.length} search lists`;
      }
      
      // Create the contact list first
      const contactList = await storage.createContactList({
        userId,
        name: listName,
        description,
        contactCount: 0
      });
      
      // Collect all contact IDs
      const allContactIds = new Set<number>();
      
      if (currentListId) {
        // Get contacts from current search list
        const companies = await storage.listCompaniesBySearchList(currentListId, userId);
        
        for (const company of companies) {
          const contacts = await storage.listContactsByCompany(company.id, userId);
          contacts.forEach(c => allContactIds.add(c.id));
        }
      }
      
      if (searchListIds && searchListIds.length > 0) {
        // Get contacts from multiple search lists
        for (const searchListId of searchListIds) {
          const companies = await storage.listCompaniesBySearchList(searchListId, userId);
          
          for (const company of companies) {
            const contacts = await storage.listContactsByCompany(company.id, userId);
            contacts.forEach(c => allContactIds.add(c.id));
          }
        }
      }
      
      // Add contacts to the list
      const contactIds = Array.from(allContactIds);
      
      if (contactIds.length > 0) {
        await storage.addContactsToList(
          contactList.id, 
          contactIds, 
          'search_list', 
          userId, 
          { searchListIds, currentListId }
        );
      }
      
      // Return the created list with updated count
      const updatedList = await storage.getContactList(contactList.id, userId);
      
      res.status(201).json({
        ...updatedList,
        contactCount: contactIds.length
      });
      
    } catch (error) {
      console.error('Error creating contact list from search:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to create contact list from search' 
      });
    }
  });

  // Import contacts from CSV
  app.post('/api/contact-lists/:id/import-csv', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      const { contacts } = req.body;
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      if (!Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ message: 'contacts must be a non-empty array' });
      }
      
      // Verify contact list belongs to user
      const contactList = await storage.getContactList(listId, userId);
      if (!contactList) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      // Process CSV contacts
      const importedContacts = [];
      const errors = [];
      
      // Cache database lookups to avoid O(n²) performance
      const allUserContacts = await storage.listContacts(userId);
      const allUserCompanies = await storage.listCompanies(userId);
      const companyCache = new Map<string, Company>(); // Cache created companies
      
      for (const csvContact of contacts) {
        try {
          // Validate required fields (email and name are required)
          if (!csvContact.email || !csvContact.name) {
            errors.push(`Skipping contact: missing ${!csvContact.email ? 'email' : 'name'} for ${csvContact.email || csvContact.name || 'Unknown'}`);
            continue;
          }
          
          // Check if contact already exists (using cached contacts)
          let contact = allUserContacts.find(c => c.email === csvContact.email);
          
          if (!contact) {
            // Check if company exists or create it
            let companyId: number | null = null;
            if (csvContact.company) {
              // Search for existing company by name (check cache first, then database)
              const companyNameLower = csvContact.company.toLowerCase();
              let company = companyCache.get(companyNameLower) || 
                          allUserCompanies.find(c => c.name?.toLowerCase() === companyNameLower);
              
              if (!company) {
                // Create new company - pass as any to include userId
                company = await storage.createCompany({
                  name: csvContact.company,
                  listId: null,
                  description: null,
                  age: null,
                  size: null,
                  website: null,
                  alternativeProfileUrl: null,
                  defaultContactEmail: null,
                  ranking: null,
                  linkedinProminence: null,
                  customerCount: null,
                  rating: null,
                  services: null,
                  validationPoints: null,
                  differentiation: null,
                  totalScore: null,
                  snapshot: null,
                  userId // Added via type cast in storage
                } as any);
                // Add to cache to avoid recreating the same company
                companyCache.set(companyNameLower, company);
              }
              companyId = company.id;
            }
            // If no company is provided, companyId remains null
            
            // Create new contact with userId passed separately
            contact = await storage.createContact({
              companyId,
              name: csvContact.name || '',
              email: csvContact.email,
              role: csvContact.role || null,
              probability: null,
              linkedinUrl: null,
              twitterHandle: null,
              phoneNumber: null,
              department: null,
              location: csvContact.city || null,
              verificationSource: 'csv_import',
              nameConfidenceScore: null,
              userFeedbackScore: null,
              feedbackCount: 0,
              alternativeEmails: [],
              completedSearches: [],
              userId // Added via type cast in storage
            } as any);
          }
          
          importedContacts.push(contact.id);
        } catch (error) {
          console.error(`Error importing contact ${csvContact.email}:`, error);
          errors.push(`Failed to import ${csvContact.email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Add imported contacts to the list
      if (importedContacts.length > 0) {
        await storage.addContactsToList(listId, importedContacts, 'csv_import', userId, {
          totalAttempted: contacts.length,
          imported: importedContacts.length,
          errors: errors.length
        });
      }
      
      // Return result
      const updatedList = await storage.getContactList(listId, userId);
      res.json({
        ...updatedList,
        imported: importedContacts.length,
        totalAttempted: contacts.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors
      });
    } catch (error) {
      console.error('Error importing contacts from CSV:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to import contacts from CSV' 
      });
    }
  });

  // Add top contacts from companies
  app.post('/api/contact-lists/:id/add-from-companies', requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = getUserId(req);
      const listId = parseInt(req.params.id);
      const { companyIds, maxContactsPerCompany = 3 } = req.body;
      
      if (isNaN(listId)) {
        return res.status(400).json({ message: 'Invalid list ID' });
      }
      
      if (!Array.isArray(companyIds) || companyIds.length === 0) {
        return res.status(400).json({ message: 'companyIds must be a non-empty array' });
      }
      
      // Verify contact list belongs to user
      const contactList = await storage.getContactList(listId, userId);
      if (!contactList) {
        return res.status(404).json({ message: 'Contact list not found' });
      }
      
      // Get top contacts from each company
      const contactIds: number[] = [];
      for (const companyId of companyIds) {
        const contacts = await storage.listContactsByCompany(companyId, userId);
        // Take up to maxContactsPerCompany contacts
        const topContacts = contacts.slice(0, maxContactsPerCompany);
        contactIds.push(...topContacts.map(c => c.id));
      }
      
      if (contactIds.length > 0) {
        await storage.addContactsToList(listId, contactIds, 'company', userId, { 
          companyIds,
          maxContactsPerCompany 
        });
      }
      
      // Return updated list
      const updatedList = await storage.getContactList(listId, userId);
      res.json({
        ...updatedList,
        addedCount: contactIds.length
      });
    } catch (error) {
      console.error('Error adding contacts from companies:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to add contacts from companies' 
      });
    }
  });
}