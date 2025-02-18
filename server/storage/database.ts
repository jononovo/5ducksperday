import { IStorage } from './index';
import { CompanyStorage } from './companies';
import { ContactStorage } from './contacts';
import { SearchStorage } from './search';
import { CampaignStorage } from './campaigns';
import { TemplateStorage } from './templates';
import { UserStorage } from './users';
import { db } from '../db';
import type { InsertUser, User } from '@shared/schema';

export class DatabaseStorage implements IStorage {
  private readonly companyStorage: CompanyStorage;
  private readonly contactStorage: ContactStorage;
  private readonly searchStorage: SearchStorage;
  private readonly campaignStorage: CampaignStorage;
  private readonly templateStorage: TemplateStorage;
  private readonly userStorage: UserStorage;

  constructor() {
    this.companyStorage = new CompanyStorage(db);
    this.contactStorage = new ContactStorage(db);
    this.searchStorage = new SearchStorage(db);
    this.campaignStorage = new CampaignStorage(db);
    this.templateStorage = new TemplateStorage(db);
    this.userStorage = new UserStorage(db);
  }

  // User operations
  createUser = (user: InsertUser): Promise<User> => this.userStorage.createUser(user);
  getUser = (id: number): Promise<User | undefined> => this.userStorage.getUser(id);
  getUserByUsername = (username: string): Promise<User | undefined> => this.userStorage.getUserByUsername(username);
  getUserByEmail = (email: string): Promise<User | undefined> => this.userStorage.getUserByEmail(email);
  updateUser = (id: number, updates: Partial<User>): Promise<User | undefined> => this.userStorage.updateUser(id, updates);

  // Lists (filtered by userId)
  getList = (listId: number): Promise<any> => this.companyStorage.getList(listId);
  listLists = (): Promise<any[]> => this.companyStorage.listLists();
  createList = (list: any): Promise<any> => this.companyStorage.createList(list);
  getNextListId = () => this.companyStorage.getNextListId();

  // Companies (no userId needed)
  getCompany = (id: number): Promise<any> => this.companyStorage.getCompany(id);
  listCompanies = (): Promise<any[]> => this.companyStorage.listCompanies();
  listCompaniesByList = (listId: number): Promise<any[]> => this.companyStorage.listCompaniesByList(listId);
  createCompany = (company: any): Promise<any> => this.companyStorage.createCompany(company);
  updateCompany = (id: number, updates: any): Promise<any> => this.companyStorage.updateCompany(id, updates);
  updateCompanyList = (companyId: number, listId: number): Promise<any> => this.companyStorage.updateCompanyList(companyId, listId);

  // Contacts
  getContact = (id: number): Promise<any> => this.contactStorage.getContact(id);
  listContactsByCompany = (companyId: number): Promise<any[]> => this.contactStorage.listContactsByCompany(companyId);
  createContact = (contact: any): Promise<any> => this.contactStorage.createContact(contact);
  updateContact = (id: number, contact: any): Promise<any> => this.contactStorage.updateContact(id, contact);
  deleteContactsByCompany = (companyId: number): Promise<void> => this.contactStorage.deleteContactsByCompany(companyId);
  enrichContact = (id: number, contactData: any): Promise<any> => this.contactStorage.enrichContact(id, contactData);
  searchContactDetails = (contactInfo: any): Promise<any> => this.contactStorage.searchContactDetails(contactInfo);
  addContactFeedback = (feedback: any): Promise<any> => this.contactStorage.addContactFeedback(feedback);
  getContactFeedback = (contactId: number): Promise<any> => this.contactStorage.getContactFeedback(contactId);
  updateContactConfidenceScore = (id: number, score: number): Promise<any> => this.contactStorage.updateContactConfidenceScore(id, score);
  updateContactValidationStatus = (id: number): Promise<any> => this.contactStorage.updateContactValidationStatus(id);

  // Campaigns (filtered by userId)
  getCampaign = (campaignId: number): Promise<any> => this.campaignStorage.getCampaign(campaignId);
  listCampaigns = (): Promise<any[]> => this.campaignStorage.listCampaigns();
  createCampaign = (campaign: any): Promise<any> => this.campaignStorage.createCampaign(campaign);
  updateCampaign = (id: number, campaign: any): Promise<any> => this.campaignStorage.updateCampaign(id, campaign);
  getNextCampaignId = () => this.campaignStorage.getNextCampaignId();

  // Campaign Lists
  addListToCampaign = (campaignList: any): Promise<any> => this.campaignStorage.addListToCampaign(campaignList);
  removeListFromCampaign = (campaignId: number, listId: number): Promise<any> => this.campaignStorage.removeListFromCampaign(campaignId, listId);
  getListsByCampaign = (campaignId: number): Promise<any[]> => this.campaignStorage.getListsByCampaign(campaignId);
  updateCampaignTotalCompanies = (campaignId: number): Promise<any> => this.campaignStorage.updateCampaignTotalCompanies(campaignId);

  // Email Templates (filtered by userId)
  getEmailTemplate = (id: number): Promise<any> => this.templateStorage.getEmailTemplate(id);
  listEmailTemplates = (): Promise<any[]> => this.templateStorage.listEmailTemplates();
  createEmailTemplate = (template: any): Promise<any> => this.templateStorage.createEmailTemplate(template);
  updateEmailTemplate = (id: number, template: any): Promise<any> => this.templateStorage.updateEmailTemplate(id, template);
  deleteEmailTemplate = (id: number): Promise<any> => this.templateStorage.deleteEmailTemplate(id);

  // Search Approaches
  getSearchApproach = (id: number): Promise<any> => this.searchStorage.getSearchApproach(id);
  listSearchApproaches = (): Promise<any[]> => this.searchStorage.listSearchApproaches();
  createSearchApproach = (approach: any): Promise<any> => this.searchStorage.createSearchApproach(approach);
  updateSearchApproach = (id: number, updates: any): Promise<any> => this.searchStorage.updateSearchApproach(id, updates);
}

// Create and export a single instance
export const storage = new DatabaseStorage();

// Initialize default data
storage.listSearchApproaches().then(async (approaches) => {
  if (approaches.length === 0) {
    await storage.searchStorage.initializeDefaultSearchApproaches();
  }
}).catch(console.error);

storage.listEmailTemplates().then(async (templates) => {
  if (templates.length === 0) {
    await storage.templateStorage.initializeDefaultEmailTemplates();
  }
}).catch(console.error);