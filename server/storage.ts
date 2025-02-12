import { 
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type SearchApproach, type InsertSearchApproach
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private companies: Map<number, Company>;
  private contacts: Map<number, Contact>;
  private searchApproaches: Map<number, SearchApproach>;
  private currentIds: { [key: string]: number };

  constructor() {
    this.companies = new Map();
    this.contacts = new Map();
    this.searchApproaches = new Map();
    this.currentIds = { companies: 1, contacts: 1, searchApproaches: 1 };
    
    // Initialize default search approaches
    this.initializeSearchApproaches();
  }

  private async initializeSearchApproaches() {
    const defaultApproaches = [
      { name: "Company Overview", prompt: "Provide a detailed overview of [COMPANY]", order: 1, active: true },
      { name: "Leadership Analysis", prompt: "List the key leadership team members of [COMPANY]", order: 2, active: true },
      { name: "Contact Discovery", prompt: "Find contact information for leadership at [COMPANY]", order: 3, active: true },
      { name: "Market Position", prompt: "Analyze market position and success metrics for [COMPANY]", order: 4, active: true },
      { name: "Customer Base", prompt: "Research customer base and market reach of [COMPANY]", order: 5, active: true },
      { name: "Online Presence", prompt: "Evaluate online presence and website metrics for [COMPANY]", order: 6, active: true },
      { name: "Services Analysis", prompt: "Detail the services and products offered by [COMPANY]", order: 7, active: true },
      { name: "Competitive Analysis", prompt: "Compare [COMPANY] with similar companies in the market", order: 8, active: true }
    ];

    for (const approach of defaultApproaches) {
      await this.createSearchApproach(approach);
    }
  }

  // Companies
  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async listCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const id = this.currentIds.companies++;
    const newCompany = { ...company, id, createdAt: new Date() };
    this.companies.set(id, newCompany);
    return newCompany;
  }

  async updateCompany(id: number, updates: Partial<Company>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    
    const updatedCompany = { ...company, ...updates };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  // Contacts
  async getContact(id: number): Promise<Contact | undefined> {
    return this.contacts.get(id);
  }

  async listContactsByCompany(companyId: number): Promise<Contact[]> {
    return Array.from(this.contacts.values())
      .filter(contact => contact.companyId === companyId);
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const id = this.currentIds.contacts++;
    const newContact = { ...contact, id, createdAt: new Date() };
    this.contacts.set(id, newContact);
    return newContact;
  }

  // Search Approaches
  async getSearchApproach(id: number): Promise<SearchApproach | undefined> {
    return this.searchApproaches.get(id);
  }

  async listSearchApproaches(): Promise<SearchApproach[]> {
    return Array.from(this.searchApproaches.values())
      .sort((a, b) => a.order - b.order);
  }

  async createSearchApproach(approach: InsertSearchApproach): Promise<SearchApproach> {
    const id = this.currentIds.searchApproaches++;
    const newApproach = { ...approach, id };
    this.searchApproaches.set(id, newApproach);
    return newApproach;
  }

  async updateSearchApproach(id: number, updates: Partial<SearchApproach>): Promise<SearchApproach | undefined> {
    const approach = this.searchApproaches.get(id);
    if (!approach) return undefined;
    
    const updatedApproach = { ...approach, ...updates };
    this.searchApproaches.set(id, updatedApproach);
    return updatedApproach;
  }
}

export const storage = new MemStorage();
