import { Request, Response, Application } from 'express';
import { storage } from '../../storage';
import { insertContactListSchema } from '@shared/schema';
import { z } from 'zod';

function getUserId(req: Request): number {
  return (req as any).user?.id;
}

export function registerContactListRoutes(app: Application, requireAuth: any) {
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
      
      await storage.addContactsToList(listId, contactIds, source, userId, sourceMetadata);
      
      // Return updated list with new contact count
      const updatedList = await storage.getContactList(listId, userId);
      res.json(updatedList);
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
      const companies = await storage.listCompaniesByList(searchListId, userId);
      
      // Get all contacts from those companies
      const contactIds: number[] = [];
      for (const company of companies) {
        const contacts = await storage.listContactsByCompany(company.id, userId);
        contactIds.push(...contacts.map(c => c.id));
      }
      
      if (contactIds.length > 0) {
        await storage.addContactsToList(listId, contactIds, 'search_list', userId, { searchListId });
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