import { Database } from '@replit/database';
import type { 
  User, InsertUser, List, InsertList, Company, InsertCompany,
  Contact, InsertContact, Campaign, InsertCampaign, CampaignList, 
  InsertCampaignList, EmailTemplate, InsertEmailTemplate,
  SearchApproach, InsertSearchApproach, SearchTestResult, 
  InsertSearchTestResult, UserPreferences, InsertUserPreferences,
  WebhookLog, InsertWebhookLog
} from "@shared/schema";
import { IStorage } from './storage/index';

export class ReplitStorage implements IStorage {
  private db: Database;
  
  constructor() {
    this.db = new Database();
  }
  
  // Core helper methods
  private async get<T>(key: string): Promise<T | undefined> {
    try {
      return await this.db.get(key) as T;
    } catch {
      return undefined;
    }
  }
  
  private async set<T>(key: string, value: T): Promise<void> {
    await this.db.set(key, value);
  }
  
  private async delete(key: string): Promise<void> {
    await this.db.delete(key);
  }
  
  private async list(prefix: string): Promise<string[]> {
    return await this.db.list(prefix);
  }
  
  private async getNextId(entity: string): Promise<number> {
    const key = `counter:${entity}`;
    const current = await this.get<number>(key) || 0;
    const next = current + 1;
    await this.set(key, next);
    return next;
  }

  // User Auth
  async getUserByEmail(email: string): Promise<User | undefined> {
    const userId = await this.get<number>(`index:user:email:${email}`);
    if (!userId) return undefined;
    return this.get<User>(`user:${userId}`);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.get<User>(`user:${id}`);
  }

  async createUser(data: { email: string; password: string; username?: string }): Promise<User> {
    const id = await this.getNextId('user');
    const now = new Date().toISOString();
    
    const user: User = {
      id,
      email: data.email,
      password: data.password,
      username: data.username || data.email.split('@')[0],
      createdAt: now
    };
    
    await this.set(`user:${id}`, user);
    await this.set(`index:user:email:${data.email}`, id);
    if (user.username) {
      await this.set(`index:user:username:${user.username}`, id);
    }
    
    return user;
  }

  // IStorage implementation
  async getUser(id: number): Promise<User | undefined> {
    return this.getUserById(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const userId = await this.get<number>(`index:user:username:${username}`);
    if (!userId) return undefined;
    return this.getUserById(userId);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = await this.getUserById(id);
    if (!user) return undefined;
    
    // Handle index updates if email or username changes
    if (updates.email && updates.email !== user.email) {
      await this.delete(`index:user:email:${user.email}`);
      await this.set(`index:user:email:${updates.email}`, id);
    }
    
    if (updates.username && updates.username !== user.username) {
      if (user.username) {
        await this.delete(`index:user:username:${user.username}`);
      }
      await this.set(`index:user:username:${updates.username}`, id);
    }
    
    const updatedUser = { ...user, ...updates };
    await this.set(`user:${id}`, updatedUser);
    return updatedUser;
  }

  // User Preferences
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return this.get<UserPreferences>(`userPrefs:${userId}`);
  }

  async updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    const now = new Date().toISOString();
    
    let prefs: UserPreferences;
    if (existing) {
      prefs = { 
        ...existing, 
        ...data, 
        updatedAt: now 
      };
    } else {
      prefs = { 
        id: await this.getNextId('userPrefs'),
        userId, 
        hasSeenTour: data.hasSeenTour ?? false,
        createdAt: now, 
        updatedAt: now 
      };
    }
    
    await this.set(`userPrefs:${userId}`, prefs);
    return prefs;
  }

  async initializeUserPreferences(userId: number): Promise<UserPreferences> {
    const existing = await this.getUserPreferences(userId);
    if (existing) return existing;
    
    return this.updateUserPreferences(userId, { hasSeenTour: false });
  }

  // Lists
  async listLists(userId: number): Promise<List[]> {
    const listIds = await this.get<number[]>(`lists:user:${userId}`) || [];
    const lists: List[] = [];
    
    for (const id of listIds) {
      const list = await this.get<List>(`list:${id}`);
      if (list) lists.push(list);
    }
    
    return lists;
  }

  async getList(listId: number, userId: number): Promise<List | undefined> {
    const lists = await this.listLists(userId);
    return lists.find(list => list.listId === listId);
  }

  async listCompaniesByList(listId: number, userId: number): Promise<Company[]> {
    const companies = await this.listCompanies(userId);
    return companies.filter(company => company.listId === listId);
  }

  async getNextListId(): Promise<number> {
    return (await this.getNextId('listSequence')) + 1000; // Start from 1001
  }

  async createList(data: InsertList): Promise<List> {
    const id = await this.getNextId('list');
    const listId = await this.getNextListId();
    const now = new Date().toISOString();
    
    const list: List = {
      ...data,
      id,
      listId,
      createdAt: now
    };
    
    // Store the list
    await this.set(`list:${id}`, list);
    
    // Add to user's lists
    const userLists = await this.get<number[]>(`lists:user:${data.userId}`) || [];
    userLists.push(id);
    await this.set(`lists:user:${data.userId}`, userLists);
    
    return list;
  }

  async updateCompanyList(companyId: number, listId: number): Promise<void> {
    const company = await this.getCompany(companyId, 0); // userId not used in implementation
    if (!company) return;
    
    const updatedCompany = { ...company, listId };
    await this.set(`company:${companyId}`, updatedCompany);
  }

  // Companies
  async listCompanies(userId: number): Promise<Company[]> {
    const companyIds = await this.get<number[]>(`companies:user:${userId}`) || [];
    const companies: Company[] = [];
    
    for (const id of companyIds) {
      const company = await this.get<Company>(`company:${id}`);
      if (company) companies.push(company);
    }
    
    return companies;
  }

  async getCompany(id: number, userId: number): Promise<Company | undefined> {
    const company = await this.get<Company>(`company:${id}`);
    if (!company || (userId !== 0 && company.userId !== userId)) return undefined;
    return company;
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const id = await this.getNextId('company');
    const now = new Date().toISOString();
    
    const company: Company = {
      ...data,
      id,
      createdAt: now
    };
    
    // Store the company
    await this.set(`company:${id}`, company);
    
    // Add to user's companies
    const userCompanies = await this.get<number[]>(`companies:user:${data.userId}`) || [];
    userCompanies.push(id);
    await this.set(`companies:user:${data.userId}`, userCompanies);
    
    return company;
  }

  // Contacts
  async listContactsByCompany(companyId: number, userId: number): Promise<Contact[]> {
    const company = await this.getCompany(companyId, userId);
    if (!company) return [];
    
    const contactIds = await this.get<number[]>(`contacts:company:${companyId}`) || [];
    const contacts: Contact[] = [];
    
    for (const id of contactIds) {
      const contact = await this.get<Contact>(`contact:${id}`);
      if (contact) contacts.push(contact);
    }
    
    return contacts;
  }

  async getContact(id: number, userId: number): Promise<Contact | undefined> {
    const contact = await this.get<Contact>(`contact:${id}`);
    if (!contact || contact.userId !== userId) return undefined;
    return contact;
  }

  async createContact(data: InsertContact): Promise<Contact> {
    const id = await this.getNextId('contact');
    const now = new Date().toISOString();
    
    const contact: Contact = {
      ...data,
      id,
      feedbackCount: 0,
      completedSearches: [],
      createdAt: now
    };
    
    // Store the contact
    await this.set(`contact:${id}`, contact);
    
    // Add to company's contacts
    const companyContacts = await this.get<number[]>(`contacts:company:${data.companyId}`) || [];
    companyContacts.push(id);
    await this.set(`contacts:company:${data.companyId}`, companyContacts);
    
    // Add to user's contacts
    const userContacts = await this.get<number[]>(`contacts:user:${data.userId}`) || [];
    userContacts.push(id);
    await this.set(`contacts:user:${data.userId}`, userContacts);
    
    return contact;
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    const contact = await this.get<Contact>(`contact:${id}`);
    if (!contact) throw new Error(`Contact ${id} not found`);
    
    const updatedContact = { ...contact, ...data };
    await this.set(`contact:${id}`, updatedContact);
    
    return updatedContact;
  }

  async deleteContactsByCompany(companyId: number, userId: number): Promise<void> {
    const contacts = await this.listContactsByCompany(companyId, userId);
    
    for (const contact of contacts) {
      await this.delete(`contact:${contact.id}`);
      
      // Update user's contacts
      const userContacts = await this.get<number[]>(`contacts:user:${userId}`) || [];
      const updatedUserContacts = userContacts.filter(id => id !== contact.id);
      await this.set(`contacts:user:${userId}`, updatedUserContacts);
    }
    
    // Clear company's contacts
    await this.set(`contacts:company:${companyId}`, []);
  }

  // Campaigns
  async listCampaigns(userId: number): Promise<Campaign[]> {
    const campaignIds = await this.get<number[]>(`campaigns:user:${userId}`) || [];
    const campaigns: Campaign[] = [];
    
    for (const id of campaignIds) {
      const campaign = await this.get<Campaign>(`campaign:${id}`);
      if (campaign) campaigns.push(campaign);
    }
    
    return campaigns;
  }

  async getCampaign(id: number, userId: number): Promise<Campaign | undefined> {
    const campaign = await this.get<Campaign>(`campaign:${id}`);
    if (!campaign || campaign.userId !== userId) return undefined;
    return campaign;
  }

  async getNextCampaignId(): Promise<number> {
    return (await this.getNextId('campaignSequence')) + 2000; // Start from 2001
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const id = await this.getNextId('campaign');
    const campaignId = await this.getNextCampaignId();
    const now = new Date().toISOString();
    
    const campaign: Campaign = {
      ...data,
      id,
      campaignId,
      status: data.status || 'draft',
      totalCompanies: data.totalCompanies || 0,
      createdAt: now
    };
    
    // Store the campaign
    await this.set(`campaign:${id}`, campaign);
    
    // Add to user's campaigns
    const userCampaigns = await this.get<number[]>(`campaigns:user:${data.userId}`) || [];
    userCampaigns.push(id);
    await this.set(`campaigns:user:${data.userId}`, userCampaigns);
    
    return campaign;
  }

  async updateCampaign(id: number, data: Partial<Campaign>, userId: number): Promise<Campaign> {
    const campaign = await this.getCampaign(id, userId);
    if (!campaign) throw new Error(`Campaign ${id} not found for user ${userId}`);
    
    const updatedCampaign = { ...campaign, ...data };
    await this.set(`campaign:${id}`, updatedCampaign);
    
    return updatedCampaign;
  }

  // Email Templates
  async listEmailTemplates(userId: number): Promise<EmailTemplate[]> {
    const templateIds = await this.get<number[]>(`emailTemplates:user:${userId}`) || [];
    const templates: EmailTemplate[] = [];
    
    for (const id of templateIds) {
      const template = await this.get<EmailTemplate>(`emailTemplate:${id}`);
      if (template) templates.push(template);
    }
    
    return templates;
  }

  async getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined> {
    const template = await this.get<EmailTemplate>(`emailTemplate:${id}`);
    if (!template || template.userId !== userId) return undefined;
    return template;
  }

  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = await this.getNextId('emailTemplate');
    const now = new Date().toISOString();
    
    const template: EmailTemplate = {
      ...data,
      id,
      category: data.category || 'general',
      createdAt: now,
      updatedAt: now
    };
    
    // Store the template
    await this.set(`emailTemplate:${id}`, template);
    
    // Add to user's templates
    const userTemplates = await this.get<number[]>(`emailTemplates:user:${data.userId}`) || [];
    userTemplates.push(id);
    await this.set(`emailTemplates:user:${data.userId}`, userTemplates);
    
    return template;
  }

  // Search Approaches
  async getSearchApproach(id: number): Promise<SearchApproach | undefined> {
    return this.get<SearchApproach>(`searchApproach:${id}`);
  }

  async listSearchApproaches(): Promise<SearchApproach[]> {
    const keys = await this.list('searchApproach:');
    const approaches: SearchApproach[] = [];
    
    for (const key of keys) {
      const approach = await this.get<SearchApproach>(key);
      if (approach) approaches.push(approach);
    }
    
    // Sort by order
    return approaches.sort((a, b) => a.order - b.order);
  }

  async updateSearchApproach(id: number, data: Partial<SearchApproach>): Promise<SearchApproach> {
    const approach = await this.getSearchApproach(id);
    if (!approach) throw new Error(`Search approach ${id} not found`);
    
    const updatedApproach = { ...approach, ...data };
    await this.set(`searchApproach:${id}`, updatedApproach);
    
    return updatedApproach;
  }

  async initializeDefaultSearchApproaches(): Promise<void> {
    const defaults = [
      {
        name: "Advanced Key Contact Discovery",
        prompt: "Find key decision makers at the company who would be responsible for purchasing services.",
        order: 1,
        active: true,
        config: {
          moduleName: "decision_maker",
          includeParameters: true
        },
        moduleType: "decision_maker",
        validationRules: {
          requireName: true,
          requireRole: true
        }
      },
      {
        name: "Comprehensive Company Analysis",
        prompt: "Perform a detailed analysis of the company, including size, services, and competitive advantages.",
        order: 2,
        active: true,
        config: {
          moduleName: "company_overview",
          includeParameters: true
        },
        moduleType: "company_overview",
        validationRules: {
          requireCompanyName: true,
          requireServices: true
        }
      },
      {
        name: "Email Pattern Discovery",
        prompt: "Identify the most likely email patterns used by the company and generate possible emails for contacts.",
        order: 3,
        active: true,
        config: {
          moduleName: "email_discovery",
          includeParameters: true
        },
        moduleType: "email_discovery",
        validationRules: {
          requireEmailFormat: true
        }
      }
    ];
    
    const existing = await this.listSearchApproaches();
    
    for (const [index, approach] of defaults.entries()) {
      const existingApproach = existing.find(a => a.name === approach.name);
      
      if (existingApproach) {
        // Update if needed
        await this.updateSearchApproach(existingApproach.id, approach);
      } else {
        // Create new
        const id = index + 1; // Use simple sequential IDs for defaults
        await this.set(`searchApproach:${id}`, {
          ...approach,
          id,
          completedSearches: [],
          technicalPrompt: "",
          responseStructure: "",
        });
      }
    }
  }

  // Search Test Results
  async getSearchTestResult(id: number): Promise<SearchTestResult | undefined> {
    return this.get<SearchTestResult>(`searchTestResult:${id}`);
  }

  async listSearchTestResults(userId: number): Promise<SearchTestResult[]> {
    const resultIds = await this.get<number[]>(`searchTestResults:user:${userId}`) || [];
    const results: SearchTestResult[] = [];
    
    for (const id of resultIds) {
      const result = await this.get<SearchTestResult>(`searchTestResult:${id}`);
      if (result) results.push(result);
    }
    
    return results;
  }

  async getTestResultsByStrategy(strategyId: number, userId: number): Promise<SearchTestResult[]> {
    const results = await this.listSearchTestResults(userId);
    return results.filter(r => r.strategyId === strategyId);
  }

  async createSearchTestResult(result: InsertSearchTestResult): Promise<SearchTestResult> {
    const id = await this.getNextId('searchTestResult');
    const now = new Date().toISOString();
    
    const newResult: SearchTestResult = {
      ...result,
      id,
      createdAt: now
    };
    
    // Store the result
    await this.set(`searchTestResult:${id}`, newResult);
    
    // Add to user's results
    const userResults = await this.get<number[]>(`searchTestResults:user:${result.userId}`) || [];
    userResults.push(id);
    await this.set(`searchTestResults:user:${result.userId}`, userResults);
    
    // Add to strategy's results
    const strategyResults = await this.get<number[]>(`testResults:strategy:${result.strategyId}`) || [];
    strategyResults.push(id);
    await this.set(`testResults:strategy:${result.strategyId}`, strategyResults);
    
    return newResult;
  }

  async updateTestResultStatus(
    id: number, 
    status: 'completed' | 'running' | 'failed', 
    metadata?: Record<string, unknown>
  ): Promise<SearchTestResult> {
    const result = await this.getSearchTestResult(id);
    if (!result) throw new Error(`Search test result ${id} not found`);
    
    const updatedResult: SearchTestResult = { 
      ...result, 
      status,
      metadata: metadata ? { ...result.metadata, ...metadata } : result.metadata
    };
    
    await this.set(`searchTestResult:${id}`, updatedResult);
    return updatedResult;
  }

  async getStrategyPerformanceHistory(
    strategyId: number, 
    userId: number
  ): Promise<{ dates: string[], scores: number[] }> {
    const results = await this.getTestResultsByStrategy(strategyId, userId);
    
    // Sort by creation date
    results.sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    return {
      dates: results.map(r => r.createdAt),
      scores: results.map(r => r.overallScore)
    };
  }

  // Migration helper methods
  async migrateFromPostgres(data: {
    users?: User[],
    lists?: List[],
    companies?: Company[],
    contacts?: Contact[],
    campaigns?: Campaign[],
    campaignLists?: CampaignList[],
    emailTemplates?: EmailTemplate[],
    searchApproaches?: SearchApproach[],
    userPreferences?: UserPreferences[],
    searchTestResults?: SearchTestResult[],
    webhookLogs?: WebhookLog[]
  }): Promise<void> {
    // Clear all existing data first for clean migration
    // This is optional and can be removed if you want to preserve existing data
    const allKeys = await this.list('');
    for (const key of allKeys) {
      await this.delete(key);
    }
    
    // 1. Users
    if (data.users?.length) {
      let maxId = 0;
      for (const user of data.users) {
        await this.set(`user:${user.id}`, user);
        await this.set(`index:user:email:${user.email}`, user.id);
        if (user.username) {
          await this.set(`index:user:username:${user.username}`, user.id);
        }
        if (user.id > maxId) maxId = user.id;
      }
      await this.set('counter:user', maxId);
    }
    
    // 2. User Preferences
    if (data.userPreferences?.length) {
      let maxId = 0;
      for (const pref of data.userPreferences) {
        await this.set(`userPrefs:${pref.userId}`, pref);
        if (pref.id > maxId) maxId = pref.id;
      }
      await this.set('counter:userPrefs', maxId);
    }
    
    // 3. Lists
    if (data.lists?.length) {
      let maxId = 0;
      let maxListId = 0;
      
      for (const list of data.lists) {
        await this.set(`list:${list.id}`, list);
        
        // Add to user's lists
        const userLists = await this.get<number[]>(`lists:user:${list.userId}`) || [];
        if (!userLists.includes(list.id)) {
          userLists.push(list.id);
          await this.set(`lists:user:${list.userId}`, userLists);
        }
        
        if (list.id > maxId) maxId = list.id;
        if (list.listId > maxListId) maxListId = list.listId;
      }
      
      await this.set('counter:list', maxId);
      await this.set('counter:listSequence', maxListId);
    }
    
    // 4. Companies
    if (data.companies?.length) {
      let maxId = 0;
      
      for (const company of data.companies) {
        await this.set(`company:${company.id}`, company);
        
        // Add to user's companies
        const userCompanies = await this.get<number[]>(`companies:user:${company.userId}`) || [];
        if (!userCompanies.includes(company.id)) {
          userCompanies.push(company.id);
          await this.set(`companies:user:${company.userId}`, userCompanies);
        }
        
        // Add to list's companies if listId exists
        if (company.listId) {
          const listCompanies = await this.get<number[]>(`companies:list:${company.listId}`) || [];
          if (!listCompanies.includes(company.id)) {
            listCompanies.push(company.id);
            await this.set(`companies:list:${company.listId}`, listCompanies);
          }
        }
        
        if (company.id > maxId) maxId = company.id;
      }
      
      await this.set('counter:company', maxId);
    }
    
    // 5. Contacts
    if (data.contacts?.length) {
      let maxId = 0;
      
      for (const contact of data.contacts) {
        await this.set(`contact:${contact.id}`, contact);
        
        // Add to company's contacts
        const companyContacts = await this.get<number[]>(`contacts:company:${contact.companyId}`) || [];
        if (!companyContacts.includes(contact.id)) {
          companyContacts.push(contact.id);
          await this.set(`contacts:company:${contact.companyId}`, companyContacts);
        }
        
        // Add to user's contacts
        const userContacts = await this.get<number[]>(`contacts:user:${contact.userId}`) || [];
        if (!userContacts.includes(contact.id)) {
          userContacts.push(contact.id);
          await this.set(`contacts:user:${contact.userId}`, userContacts);
        }
        
        if (contact.id > maxId) maxId = contact.id;
      }
      
      await this.set('counter:contact', maxId);
    }
    
    // 6. Campaigns
    if (data.campaigns?.length) {
      let maxId = 0;
      let maxCampaignId = 0;
      
      for (const campaign of data.campaigns) {
        await this.set(`campaign:${campaign.id}`, campaign);
        
        // Add to user's campaigns
        const userCampaigns = await this.get<number[]>(`campaigns:user:${campaign.userId}`) || [];
        if (!userCampaigns.includes(campaign.id)) {
          userCampaigns.push(campaign.id);
          await this.set(`campaigns:user:${campaign.userId}`, userCampaigns);
        }
        
        if (campaign.id > maxId) maxId = campaign.id;
        if (campaign.campaignId > maxCampaignId) maxCampaignId = campaign.campaignId;
      }
      
      await this.set('counter:campaign', maxId);
      await this.set('counter:campaignSequence', maxCampaignId);
    }
    
    // 7. Campaign Lists
    if (data.campaignLists?.length) {
      let maxId = 0;
      
      for (const campaignList of data.campaignLists) {
        // Add to campaign's lists
        const campaignLists = await this.get<number[]>(`campaign:${campaignList.campaignId}:lists`) || [];
        if (!campaignLists.includes(campaignList.listId)) {
          campaignLists.push(campaignList.listId);
          await this.set(`campaign:${campaignList.campaignId}:lists`, campaignLists);
        }
        
        if (campaignList.id > maxId) maxId = campaignList.id;
      }
      
      await this.set('counter:campaignList', maxId);
    }
    
    // 8. Email Templates
    if (data.emailTemplates?.length) {
      let maxId = 0;
      
      for (const template of data.emailTemplates) {
        await this.set(`emailTemplate:${template.id}`, template);
        
        // Add to user's templates
        const userTemplates = await this.get<number[]>(`emailTemplates:user:${template.userId}`) || [];
        if (!userTemplates.includes(template.id)) {
          userTemplates.push(template.id);
          await this.set(`emailTemplates:user:${template.userId}`, userTemplates);
        }
        
        if (template.id > maxId) maxId = template.id;
      }
      
      await this.set('counter:emailTemplate', maxId);
    }
    
    // 9. Search Approaches
    if (data.searchApproaches?.length) {
      let maxId = 0;
      
      for (const approach of data.searchApproaches) {
        await this.set(`searchApproach:${approach.id}`, approach);
        
        if (approach.id > maxId) maxId = approach.id;
      }
      
      await this.set('counter:searchApproach', maxId);
    } else {
      // If no search approaches were provided, initialize defaults
      await this.initializeDefaultSearchApproaches();
    }
    
    // 10. Search Test Results
    if (data.searchTestResults?.length) {
      let maxId = 0;
      
      for (const result of data.searchTestResults) {
        await this.set(`searchTestResult:${result.id}`, result);
        
        // Add to user's results
        const userResults = await this.get<number[]>(`searchTestResults:user:${result.userId}`) || [];
        if (!userResults.includes(result.id)) {
          userResults.push(result.id);
          await this.set(`searchTestResults:user:${result.userId}`, userResults);
        }
        
        // Add to strategy's results
        const strategyResults = await this.get<number[]>(`testResults:strategy:${result.strategyId}`) || [];
        if (!strategyResults.includes(result.id)) {
          strategyResults.push(result.id);
          await this.set(`testResults:strategy:${result.strategyId}`, strategyResults);
        }
        
        if (result.id > maxId) maxId = result.id;
      }
      
      await this.set('counter:searchTestResult', maxId);
    }
    
    // 11. Webhook Logs
    if (data.webhookLogs?.length) {
      let maxId = 0;
      
      for (const log of data.webhookLogs) {
        await this.set(`webhookLog:${log.id}`, log);
        
        if (log.id > maxId) maxId = log.id;
      }
      
      await this.set('counter:webhookLog', maxId);
    }
    
    console.log('Migration from PostgreSQL to Replit DB completed successfully!');
  }
}

// Export a singleton instance
export const storage = new ReplitStorage();