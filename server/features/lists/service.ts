import { storage } from '../../storage';
import { ListRequest, ListResponse, UpdateListRequest } from './types';

export class ListsService {
  static extractCustomSearchTargets(contactSearchConfig: ListRequest['contactSearchConfig']): string[] {
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

  static async getLists(userId: number, isAuthenticated: boolean) {
    if (isAuthenticated) {
      return storage.listLists(userId);
    } else {
      // For unauthenticated users, return only demo lists (userId = 1)
      return storage.listLists(1);
    }
  }

  static async getList(listId: number, userId: number, isAuthenticated: boolean) {
    let list = null;
    
    // First try to find the list for the authenticated user
    if (isAuthenticated) {
      list = await storage.getList(listId, userId);
    }
    
    // If not found or not authenticated, check if it's a demo list
    if (!list) {
      list = await storage.getList(listId, 1); // Check demo user (ID 1)
    }
    
    return list;
  }

  static async getListCompanies(listId: number, userId: number, isAuthenticated: boolean) {
    let companies = [];
    
    // First try to find companies for the authenticated user's list
    if (isAuthenticated) {
      companies = await storage.listCompaniesByList(listId, userId);
    }
    
    // If none found or not authenticated, check for demo list companies
    if (companies.length === 0) {
      companies = await storage.listCompaniesByList(listId, 1); // Check demo user (ID 1)
    }
    
    return companies;
  }

  static async createList(request: ListRequest, userId: number): Promise<ListResponse> {
    const { companies, prompt, contactSearchConfig } = request;
    
    console.log(`Creating list with ${companies?.length || 0} companies for user ${userId}`);
    
    const listId = await storage.getNextListId();
    const customSearchTargets = this.extractCustomSearchTargets(contactSearchConfig);
    
    const list = await storage.createList({
      listId,
      prompt,
      resultCount: companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null,
      userId
    });

    await Promise.all(
      companies.map(company =>
        storage.updateCompanyList(company.id, listId)
      )
    );

    return list;
  }

  static async updateList(
    listId: number,
    request: UpdateListRequest,
    userId: number
  ): Promise<ListResponse | null> {
    const { companies, prompt, contactSearchConfig } = request;
    
    console.log(`Updating list ${listId} with ${companies?.length || 0} companies for user ${userId}`);
    
    // Check if list exists and user has permission
    const existingList = await storage.getList(listId, userId);
    if (!existingList) {
      console.log(`List update failed: List ${listId} not found for user ${userId}`);
      return null;
    }
    
    console.log(`Found existing list ${listId} for user ${userId}: ${existingList.name}`);
    
    // Verify all companies belong to the user and exist
    const companyValidation = await Promise.all(
      companies.map(async (company) => {
        if (!company.id || typeof company.id !== 'number') {
          return { id: company.id, exists: false, error: 'Invalid company ID' };
        }
        const exists = await storage.getCompany(company.id, userId);
        return { id: company.id, exists: !!exists };
      })
    );
    
    const invalidCompanies = companyValidation.filter(c => !c.exists);
    if (invalidCompanies.length > 0) {
      console.log(`List update failed: Invalid companies for user ${userId}:`, invalidCompanies.map(c => c.id));
      throw new Error(`Invalid or unauthorized companies: ${invalidCompanies.map(c => c.id).join(', ')}`);
    }
    
    const customSearchTargets = this.extractCustomSearchTargets(contactSearchConfig);
    
    // Update the list metadata
    const updated = await storage.updateList(listId, {
      prompt,
      resultCount: companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null
    }, userId);
    
    if (!updated) {
      console.log(`List update failed: updateList returned null for list ${listId}`);
      return null;
    }
    
    // Update company associations (only after successful list update)
    await Promise.all(
      companies.map(company =>
        storage.updateCompanyList(company.id, listId)
      )
    );
    
    console.log(`List ${listId} successfully updated with ${companies.length} companies`);
    return updated;
  }
}