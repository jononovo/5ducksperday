import { 
  userPreferences, lists, companies, contacts, campaigns, emailTemplates, searchApproaches, users,
  type UserPreferences, type InsertUserPreferences,
  type List, type InsertList,
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type Campaign, type InsertCampaign,
  type EmailTemplate, type InsertEmailTemplate,
  type SearchApproach,
  type User
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User Auth
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(data: { email: string; username: string; password: string }): Promise<User>;

  // User Preferences
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences>;
  initializeUserPreferences(userId: number): Promise<UserPreferences>;

  // Lists
  listLists(userId: number): Promise<List[]>;
  getList(listId: number, userId: number): Promise<List | undefined>;
  listCompaniesByList(listId: number, userId: number): Promise<Company[]>;
  getNextListId(): Promise<number>;
  createList(data: InsertList): Promise<List>;
  updateCompanyList(companyId: number, listId: number): Promise<void>;

  // Companies
  listCompanies(userId: number): Promise<Company[]>;
  getCompany(id: number, userId: number): Promise<Company | undefined>;
  createCompany(data: InsertCompany): Promise<Company>;

  // Contacts
  listContactsByCompany(companyId: number, userId: number): Promise<Contact[]>;
  getContact(id: number, userId: number): Promise<Contact | undefined>;
  createContact(data: InsertContact): Promise<Contact>;
  updateContact(id: number, data: Partial<Contact>): Promise<Contact>;
  deleteContactsByCompany(companyId: number, userId: number): Promise<void>;

  // Campaigns
  listCampaigns(userId: number): Promise<Campaign[]>;
  getCampaign(id: number, userId: number): Promise<Campaign | undefined>;
  getNextCampaignId(): Promise<number>;
  createCampaign(data: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, data: Partial<Campaign>, userId: number): Promise<Campaign>;

  // Email Templates
  listEmailTemplates(userId: number): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate>;

  // Search Approaches
  listSearchApproaches(): Promise<SearchApproach[]>;
  updateSearchApproach(id: number, data: Partial<SearchApproach>): Promise<SearchApproach>;
}

class DatabaseStorage implements IStorage {
  // User Auth methods
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async createUser(data: { email: string; username: string; password: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(data)
      .returning();

    await this.initializeUserPreferences(user.id);

    return user;
  }

  // User Preferences
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    if (!prefs) {
      return this.initializeUserPreferences(userId);
    }

    return prefs;
  }

  async updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    const [existing] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));

    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }

    return this.initializeUserPreferences(userId);
  }

  async initializeUserPreferences(userId: number): Promise<UserPreferences> {
    const [prefs] = await db
      .insert(userPreferences)
      .values({ userId, hasSeenTour: false })
      .returning();
    return prefs;
  }

  // Lists
  async listLists(userId: number): Promise<List[]> {
    return db.select().from(lists).where(eq(lists.userId, userId));
  }

  async getList(listId: number, userId: number): Promise<List | undefined> {
    const [list] = await db.select().from(lists).where(eq(lists.listId, listId)).where(eq(lists.userId, userId));
    return list;
  }

  async listCompaniesByList(listId: number, userId: number): Promise<Company[]> {
    return db.select()
      .from(companies)
      .where(eq(companies.listId, listId))
      .where(eq(companies.userId, userId));
  }

  async getNextListId(): Promise<number> {
    const [result] = await db.select({ maxId: lists.listId }).from(lists);
    return (result?.maxId || 1000) + 1;
  }

  async createList(data: InsertList): Promise<List> {
    const [list] = await db.insert(lists).values(data).returning();
    return list;
  }

  async updateCompanyList(companyId: number, listId: number): Promise<void> {
    await db.update(companies)
      .set({ listId })
      .where(eq(companies.id, companyId));
  }

  // Companies
  async listCompanies(userId: number): Promise<Company[]> {
    return db.select().from(companies).where(eq(companies.userId, userId));
  }

  async getCompany(id: number, userId: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).where(eq(companies.userId, userId));
    return company;
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const [company] = await db.insert(companies).values(data).returning();
    return company;
  }

  // Contacts
  async listContactsByCompany(companyId: number, userId: number): Promise<Contact[]> {
    return db.select()
      .from(contacts)
      .where(eq(contacts.companyId, companyId))
      .where(eq(contacts.userId, userId));
  }

  async getContact(id: number, userId: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id)).where(eq(contacts.userId, userId));
    return contact;
  }

  async createContact(data: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(data).returning();
    return contact;
  }

  async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
    const [updated] = await db.update(contacts)
      .set(data)
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async deleteContactsByCompany(companyId: number, userId: number): Promise<void> {
    await db.delete(contacts)
      .where(eq(contacts.companyId, companyId))
      .where(eq(contacts.userId, userId));
  }

  // Campaigns
  async listCampaigns(userId: number): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.userId, userId));
  }

  async getCampaign(id: number, userId: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.campaignId, id)).where(eq(campaigns.userId, userId));
    return campaign;
  }

  async getNextCampaignId(): Promise<number> {
    const [result] = await db.select({ maxId: campaigns.campaignId }).from(campaigns);
    return (result?.maxId || 2000) + 1;
  }

  async createCampaign(data: InsertCampaign): Promise<Campaign> {
    const [campaign] = await db.insert(campaigns).values(data).returning();
    return campaign;
  }

  async updateCampaign(id: number, data: Partial<Campaign>, userId: number): Promise<Campaign> {
    const [updated] = await db.update(campaigns)
      .set(data)
      .where(eq(campaigns.campaignId, id))
      .where(eq(campaigns.userId, userId))
      .returning();
    return updated;
  }

  // Email Templates
  async listEmailTemplates(userId: number): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).where(eq(emailTemplates.userId, userId));
  }

  async getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).where(eq(emailTemplates.userId, userId));
    return template;
  }

  async createEmailTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db.insert(emailTemplates).values(data).returning();
    return template;
  }

  // Search Approaches
  async listSearchApproaches(): Promise<SearchApproach[]> {
    return db.select().from(searchApproaches);
  }

  async updateSearchApproach(id: number, data: Partial<SearchApproach>): Promise<SearchApproach> {
    const [updated] = await db.update(searchApproaches)
      .set(data)
      .where(eq(searchApproaches.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();