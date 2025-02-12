import { 
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type SearchApproach, type InsertSearchApproach,
  type List, type InsertList,
  type Campaign, type InsertCampaign,
  type CampaignList, type InsertCampaignList,
  companies, contacts, searchApproaches, lists, campaigns, campaignLists
} from "@shared/schema";
import { db } from "./db";
import { eq, max, and, sql } from "drizzle-orm";

export interface IStorage {
  // Lists
  getList(listId: number): Promise<List | undefined>;
  listLists(): Promise<List[]>;
  createList(list: InsertList): Promise<List>;
  getNextListId(): Promise<number>;

  // Campaigns
  getCampaign(id: number): Promise<Campaign | undefined>;
  listCampaigns(): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getNextCampaignId(): Promise<string>;
  addListsToCampaign(campaignId: number, listIds: number[]): Promise<CampaignList[]>;
  getListsByCampaign(campaignId: number): Promise<List[]>;
  getCampaignStats(campaignId: number): Promise<{ totalLists: number; totalCompanies: number; }>;

  // Companies
  getCompany(id: number): Promise<Company | undefined>;
  listCompanies(): Promise<Company[]>;
  listCompaniesByList(listId: number): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company | undefined>;
  updateCompanyList(companyId: number, listId: number): Promise<Company | undefined>;

  // Contacts
  getContact(id: number): Promise<Contact | undefined>;
  listContactsByCompany(companyId: number): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;

  // Search Approaches
  getSearchApproach(id: number): Promise<SearchApproach | undefined>;
  listSearchApproaches(): Promise<SearchApproach[]>;
  createSearchApproach(approach: InsertSearchApproach): Promise<SearchApproach>;
  updateSearchApproach(id: number, approach: Partial<SearchApproach>): Promise<SearchApproach | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Lists
  async getList(listId: number): Promise<List | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.listId, listId));
    return list;
  }

  async listLists(): Promise<List[]> {
    return db.select().from(lists).orderBy(lists.listId);
  }

  async createList(list: InsertList): Promise<List> {
    const [created] = await db.insert(lists).values(list).returning();
    return created;
  }

  async getNextListId(): Promise<number> {
    const [result] = await db
      .select({ maxListId: max(lists.listId) })
      .from(lists);
    return (result?.maxListId || 1000) + 1;
  }

  // Campaigns
  async getCampaign(id: number): Promise<Campaign | undefined> {
    if (isNaN(id)) {
      return undefined;
    }
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async listCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns).orderBy(campaigns.createdAt);
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign).returning();
    return created;
  }

  async getNextCampaignId(): Promise<string> {
    const [result] = await db
      .select({ maxId: sql<string>`MAX(${campaigns.campaignId})` })
      .from(campaigns);

    if (!result?.maxId) {
      return 'CM-00100';
    }

    const currentNumber = parseInt(result.maxId.split('-')[1]);
    return `CM-${String(currentNumber + 1).padStart(5, '0')}`;
  }

  async addListsToCampaign(campaignId: number, listIds: number[]): Promise<CampaignList[]> {
    const values = listIds.map(listId => ({
      campaignId,
      listId,
    }));

    return db.insert(campaignLists).values(values).returning();
  }

  async getListsByCampaign(campaignId: number): Promise<List[]> {
    if (isNaN(campaignId)) {
      return [];
    }

    return db
      .select({
        id: lists.id,
        listId: lists.listId,
        prompt: lists.prompt,
        resultCount: lists.resultCount,
        createdAt: lists.createdAt
      })
      .from(lists)
      .innerJoin(campaignLists, eq(lists.listId, campaignLists.listId))
      .where(eq(campaignLists.campaignId, campaignId));
  }

  async getCampaignStats(campaignId: number): Promise<{ totalLists: number; totalCompanies: number; }> {
    if (isNaN(campaignId)) {
      return { totalLists: 0, totalCompanies: 0 };
    }

    // Get total lists
    const [listsResult] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(campaignLists)
      .where(eq(campaignLists.campaignId, campaignId));

    // Get total companies across all lists in the campaign
    const [companiesResult] = await db
      .select({ count: sql<number>`COUNT(DISTINCT ${companies.id})` })
      .from(companies)
      .innerJoin(lists, eq(companies.listId, lists.listId))
      .innerJoin(campaignLists, eq(lists.listId, campaignLists.listId))
      .where(eq(campaignLists.campaignId, campaignId));

    return {
      totalLists: listsResult?.count || 0,
      totalCompanies: companiesResult?.count || 0
    };
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    if (isNaN(id)) {
      return undefined;
    }
    const [updated] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async updateCampaignLists(campaignId: number, listIds: number[]): Promise<void> {
    if (isNaN(campaignId)) {
      return;
    }

    // Delete existing campaign lists
    await db
      .delete(campaignLists)
      .where(eq(campaignLists.campaignId, campaignId));

    // Add new campaign lists
    if (listIds.length > 0) {
      const values = listIds.map(listId => ({
        campaignId,
        listId,
      }));
      await db.insert(campaignLists).values(values);
    }
  }

  // Companies
  async getCompany(id: number): Promise<Company | undefined> {
    if (isNaN(id)) {
      return undefined;
    }
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async listCompanies(): Promise<Company[]> {
    return db.select().from(companies);
  }

  async listCompaniesByList(listId: number): Promise<Company[]> {
    if (isNaN(listId)) {
      return [];
    }
    return db.select().from(companies).where(eq(companies.listId, listId));
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company | undefined> {
    if (isNaN(id)) {
      return undefined;
    }
    const [updated] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  async updateCompanyList(companyId: number, listId: number): Promise<Company | undefined> {
    if (isNaN(companyId) || isNaN(listId)) {
      return undefined;
    }
    const [updated] = await db
      .update(companies)
      .set({ listId })
      .where(eq(companies.id, companyId))
      .returning();
    return updated;
  }

  // Contacts
  async getContact(id: number): Promise<Contact | undefined> {
    if (isNaN(id)) {
      return undefined;
    }
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async listContactsByCompany(companyId: number): Promise<Contact[]> {
    if (isNaN(companyId)) {
      return [];
    }
    return db.select().from(contacts).where(eq(contacts.companyId, companyId));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  // Search Approaches
  async getSearchApproach(id: number): Promise<SearchApproach | undefined> {
    if (isNaN(id)) {
      return undefined;
    }
    const [approach] = await db.select().from(searchApproaches).where(eq(searchApproaches.id, id));
    return approach;
  }

  async listSearchApproaches(): Promise<SearchApproach[]> {
    return db.select().from(searchApproaches).orderBy(searchApproaches.order);
  }

  async createSearchApproach(approach: InsertSearchApproach): Promise<SearchApproach> {
    const [created] = await db.insert(searchApproaches).values(approach).returning();
    return created;
  }

  async updateSearchApproach(id: number, updates: Partial<SearchApproach>): Promise<SearchApproach | undefined> {
    if (isNaN(id)) {
      return undefined;
    }
    const [updated] = await db
      .update(searchApproaches)
      .set(updates)
      .where(eq(searchApproaches.id, id))
      .returning();
    return updated;
  }

  // Initialize default search approaches if none exist
  async initializeDefaultSearchApproaches() {
    const existing = await this.listSearchApproaches();
    if (existing.length === 0) {
      const defaultApproaches = [
        { name: "Company Overview", prompt: "Provide a detailed overview of [COMPANY], including its age, size, and main business focus.", order: 1, active: true },
        { name: "Leadership Analysis", prompt: "List and analyze the key leadership team members of [COMPANY], including their roles and experience.", order: 2, active: true },
        { name: "Contact Discovery", prompt: "Find contact information and email addresses for leadership and key decision makers at [COMPANY].", order: 3, active: true },
        { name: "Market Position", prompt: "Analyze the market position, success metrics, and industry standing of [COMPANY].", order: 4, active: true },
        { name: "Customer Base", prompt: "Research and describe the customer base, target market, and market reach of [COMPANY].", order: 5, active: true },
        { name: "Online Presence", prompt: "Evaluate the online presence, website metrics, and digital footprint of [COMPANY].", order: 6, active: true },
        { name: "Services Analysis", prompt: "Detail the educational services, programs, and products offered by [COMPANY], particularly in coding and STEM education.", order: 7, active: true },
        { name: "Competitive Analysis", prompt: "Compare [COMPANY] with similar educational companies in the market, focusing on their unique selling propositions.", order: 8, active: true },
        { name: "Differentiation Analysis", prompt: "Identify the top 3 unique differentiators that set [COMPANY] apart from competitors. Focus on their competitive advantages and unique value propositions.", order: 9, active: true }
      ];

      for (const approach of defaultApproaches) {
        await this.createSearchApproach(approach);
      }
    }
  }
}

export const storage = new DatabaseStorage();

// Initialize default search approaches
storage.initializeDefaultSearchApproaches().catch(console.error);