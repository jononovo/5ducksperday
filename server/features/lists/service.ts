import { storage } from '../../storage';
import { SearchListRequest, SearchListResponse, UpdateSearchListRequest } from './types';

export class SearchListsService {
  static extractCustomSearchTargets(contactSearchConfig: SearchListRequest['contactSearchConfig']): string[] {
    const customSearchTargets: string[] = [];
    if (contactSearchConfig) {
      if (contactSearchConfig.enableCustomSearch && contactSearchConfig.customSearchTarget) {
        customSearchTargets.push(contactSearchConfig.customSearchTarget);
      }
      if (contactSearchConfig.enableCustomSearch2 && contactSearchConfig.customSearchTarget2) {
        customSearchTargets.push(contactSearchConfig.customSearchTarget2);
      }
    }
    return customSearchTargets;
  }

  static async getSearchLists(userId: number, isAuthenticated: boolean) {
    if (isAuthenticated) {
      return storage.listSearchLists(userId);
    } else {
      // For unauthenticated users, return only demo lists (userId = 1)
      return storage.listSearchLists(1);
    }
  }

  static async getSearchList(listId: number, userId: number, isAuthenticated: boolean) {
    let list = null;
    
    // First try to find the list for the authenticated user
    if (isAuthenticated) {
      list = await storage.getSearchList(listId, userId);
    }
    
    // If not found or not authenticated, check if it's a demo list
    if (!list) {
      list = await storage.getSearchList(listId, 1); // Check demo user (ID 1)
    }
    
    return list;
  }

  static async getSearchListCompanies(listId: number, userId: number, isAuthenticated: boolean) {
    let companies = [];
    
    // First try to find companies for the authenticated user's list
    if (isAuthenticated) {
      companies = await storage.listCompaniesBySearchList(listId, userId);
    }
    
    // If none found or not authenticated, check for demo list companies
    if (companies.length === 0) {
      companies = await storage.listCompaniesBySearchList(listId, 1); // Check demo user (ID 1)
    }
    
    return companies;
  }

  static async createSearchList(request: SearchListRequest, userId: number): Promise<SearchListResponse> {
    const { companies, prompt, contactSearchConfig } = request;
    
    console.log(`Creating list with ${companies?.length || 0} companies for user ${userId}`);
    
    const listId = await storage.getNextSearchListId();
    const customSearchTargets = this.extractCustomSearchTargets(contactSearchConfig);
    
    const list = await storage.createSearchList({
      listId,
      prompt,
      resultCount: companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null,
      userId
    });

    // Save companies and their contacts to database first, then link to list
    const savedCompanyIds: number[] = [];
    for (const company of companies) {
      try {
        // Create or update the company
        let savedCompany;
        if (company.id && typeof company.id === 'number') {
          // Company might already exist, try to get it
          const existing = await storage.getCompany(company.id, userId);
          if (existing) {
            savedCompany = existing;
          } else {
            // Create new company
            savedCompany = await storage.createCompany({
              name: company.name,
              website: company.website || null,
              industry: company.industry || null,
              description: company.description || null,
              size: company.size ? parseInt(company.size as string) : null,
              location: company.location || null,
              revenue: company.revenue || null,
              userId
            });
          }
        } else {
          // No ID, create new company
          savedCompany = await storage.createCompany({
            name: company.name,
            website: company.website || null,
            industry: company.industry || null,
            description: company.description || null,
            size: company.size ? parseInt(company.size as string) : null,
            location: company.location || null,
            revenue: company.revenue || null,
            userId
          });
        }
        
        // Save contacts for this company
        if (company.contacts && company.contacts.length > 0) {
          for (const contact of company.contacts) {
            try {
              // Check if contact already exists
              const existingContacts = await storage.listContactsByCompany(savedCompany.id, userId);
              const existingContact = existingContacts.find(c => 
                (c.email && contact.email && c.email.toLowerCase() === contact.email.toLowerCase()) ||
                (c.name && contact.name && c.name.toLowerCase() === contact.name.toLowerCase())
              );
              
              if (!existingContact) {
                await storage.createContact({
                  name: contact.name,
                  email: contact.email || null,
                  role: contact.role || null,
                  companyId: savedCompany.id,
                  linkedinUrl: contact.linkedinUrl || null,
                  phoneNumber: contact.phoneNumber || null,
                  lastValidated: new Date()
                }, userId);
              }
            } catch (contactError) {
              console.error(`Error saving contact ${contact.name}:`, contactError);
            }
          }
        }
        
        // Link company to search list
        await storage.updateCompanySearchList(savedCompany.id, listId);
        savedCompanyIds.push(savedCompany.id);
      } catch (companyError) {
        console.error(`Error saving company ${company.name}:`, companyError);
      }
    }

    console.log(`Saved ${savedCompanyIds.length} companies and linked them to list ${listId}`);
    return list;
  }

  static async updateSearchList(
    listId: number,
    request: UpdateSearchListRequest,
    userId: number
  ): Promise<SearchListResponse | null> {
    const { companies, prompt, contactSearchConfig } = request;
    
    console.log(`Updating list ${listId} with ${companies?.length || 0} companies for user ${userId}`);
    
    // Check if list exists and user has permission
    const existingList = await storage.getSearchList(listId, userId);
    if (!existingList) {
      console.log(`List update failed: List ${listId} not found for user ${userId}`);
      return null;
    }
    
    console.log(`Found existing list ${listId} for user ${userId}: ${existingList.prompt}`);
    
    // Save companies and their contacts to database first, then link to list
    const savedCompanyIds: number[] = [];
    for (const company of companies) {
      try {
        // Create or update the company
        let savedCompany;
        if (company.id && typeof company.id === 'number') {
          // Company might already exist, try to get it
          const existing = await storage.getCompany(company.id, userId);
          if (existing) {
            savedCompany = existing;
          } else {
            // Create new company
            savedCompany = await storage.createCompany({
              name: company.name,
              website: company.website || null,
              industry: company.industry || null,
              description: company.description || null,
              size: company.size ? parseInt(company.size as string) : null,
              location: company.location || null,
              revenue: company.revenue || null,
              userId
            });
          }
        } else {
          // No ID, create new company
          savedCompany = await storage.createCompany({
            name: company.name,
            website: company.website || null,
            industry: company.industry || null,
            description: company.description || null,
            size: company.size ? parseInt(company.size as string) : null,
            location: company.location || null,
            revenue: company.revenue || null,
            userId
          });
        }
        
        // Save contacts for this company
        if (company.contacts && company.contacts.length > 0) {
          for (const contact of company.contacts) {
            try {
              // Check if contact already exists
              const existingContacts = await storage.listContactsByCompany(savedCompany.id, userId);
              const existingContact = existingContacts.find(c => 
                (c.email && contact.email && c.email.toLowerCase() === contact.email.toLowerCase()) ||
                (c.name && contact.name && c.name.toLowerCase() === contact.name.toLowerCase())
              );
              
              if (!existingContact) {
                await storage.createContact({
                  name: contact.name,
                  email: contact.email || null,
                  role: contact.role || null,
                  companyId: savedCompany.id,
                  linkedinUrl: contact.linkedinUrl || null,
                  phoneNumber: contact.phoneNumber || null,
                  lastValidated: new Date()
                }, userId);
              }
            } catch (contactError) {
              console.error(`Error saving contact ${contact.name}:`, contactError);
            }
          }
        }
        
        // Link company to search list
        await storage.updateCompanySearchList(savedCompany.id, listId);
        savedCompanyIds.push(savedCompany.id);
      } catch (companyError) {
        console.error(`Error saving company ${company.name}:`, companyError);
      }
    }
    
    const customSearchTargets = this.extractCustomSearchTargets(contactSearchConfig);
    
    // Update the list metadata
    const updated = await storage.updateSearchList(listId, {
      prompt,
      resultCount: companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null
    }, userId);
    
    if (!updated) {
      console.log(`List update failed: updateSearchList returned null for list ${listId}`);
      return null;
    }
    
    console.log(`List ${listId} successfully updated with ${savedCompanyIds.length} companies`);
    return updated;
  }
}