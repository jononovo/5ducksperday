import { 
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type SearchApproach, type InsertSearchApproach,
  companies, contacts, searchApproaches
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Companies
  getCompany(id: number): Promise<Company | undefined>;
  listCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<Company>): Promise<Company | undefined>;

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
  // Companies
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async listCompanies(): Promise<Company[]> {
    return db.select().from(companies);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [created] = await db.insert(companies).values(company).returning();
    return created;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company | undefined> {
    const [updated] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();
    return updated;
  }

  // Contacts
  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async listContactsByCompany(companyId: number): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.companyId, companyId));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  // Search Approaches
  async getSearchApproach(id: number): Promise<SearchApproach | undefined> {
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