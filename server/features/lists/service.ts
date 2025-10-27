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

    await Promise.all(
      companies.map(company =>
        storage.updateCompanySearchList(company.id, listId)
      )
    );

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
    const updated = await storage.updateSearchList(listId, {
      prompt,
      resultCount: companies.length,
      customSearchTargets: customSearchTargets.length > 0 ? customSearchTargets : null
    }, userId);
    
    if (!updated) {
      console.log(`List update failed: updateSearchList returned null for list ${listId}`);
      return null;
    }
    
    // Update company associations (only after successful list update)
    await Promise.all(
      companies.map(company =>
        storage.updateCompanySearchList(company.id, listId)
      )
    );
    
    console.log(`List ${listId} successfully updated with ${companies.length} companies`);
    return updated;
  }
}