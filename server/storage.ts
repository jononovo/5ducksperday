import { 
  type Company, type InsertCompany,
  type Contact, type InsertContact,
  type SearchApproach, type InsertSearchApproach,
  type List, type InsertList,
  type Campaign, type InsertCampaign,
  type CampaignList, type InsertCampaignList,
  type EmailTemplate, type InsertEmailTemplate,
  companies, contacts, searchApproaches, lists,
  campaigns, campaignLists, emailTemplates
} from "@shared/schema";
import { db } from "./db";
import { eq, max } from "drizzle-orm";

// Assuming these types are defined elsewhere (not provided in original code)
type ContactFeedback = {
  id: number;
  contactId: number;
  feedbackType: 'excellent' | 'ok' | 'terrible';
  comment?: string;
  createdAt: Date;
};

type InsertContactFeedback = Omit<ContactFeedback, 'id' | 'createdAt'>;
type contactFeedback = any; // Placeholder until schema is provided


export interface IStorage {
  // Lists
  getList(listId: number): Promise<List | undefined>;
  listLists(): Promise<List[]>;
  createList(list: InsertList): Promise<List>;
  getNextListId(): Promise<number>;

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
  updateContact(id: number, contact: Partial<Contact>): Promise<Contact | undefined>;
  deleteContactsByCompany(companyId: number): Promise<void>;

  // Search Approaches
  getSearchApproach(id: number): Promise<SearchApproach | undefined>;
  listSearchApproaches(): Promise<SearchApproach[]>;
  createSearchApproach(approach: InsertSearchApproach): Promise<SearchApproach>;
  updateSearchApproach(id: number, approach: Partial<SearchApproach>): Promise<SearchApproach | undefined>;

  // Campaigns
  getCampaign(campaignId: number): Promise<Campaign | undefined>;
  listCampaigns(): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: number, campaign: Partial<Campaign>): Promise<Campaign | undefined>;
  getNextCampaignId(): Promise<number>;

  // Campaign Lists
  addListToCampaign(campaignList: InsertCampaignList): Promise<CampaignList>;
  removeListFromCampaign(campaignId: number, listId: number): Promise<void>;
  getListsByCampaign(campaignId: number): Promise<List[]>;
  updateCampaignTotalCompanies(campaignId: number): Promise<void>;

  // Email Templates
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  listEmailTemplates(): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<void>;

  // Add new methods for detailed contact search
  enrichContact(id: number, contactData: Partial<Contact>): Promise<Contact | undefined>;
  searchContactDetails(contactInfo: { name: string; company: string }): Promise<Partial<Contact>>;
  deleteContactsByCompany(companyId: number): Promise<void>;

  // New methods for contact validation and feedback
  addContactFeedback(feedback: InsertContactFeedback): Promise<ContactFeedback>;
  getContactFeedback(contactId: number): Promise<ContactFeedback[]>;
  updateContactConfidenceScore(id: number, score: number): Promise<Contact | undefined>;
  updateContactValidationStatus(id: number): Promise<Contact | undefined>;
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

  // Companies
  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async listCompanies(): Promise<Company[]> {
    return db.select().from(companies);
  }

  async listCompaniesByList(listId: number): Promise<Company[]> {
    return db.select().from(companies).where(eq(companies.listId, listId));
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

  async updateCompanyList(companyId: number, listId: number): Promise<Company | undefined> {
    const [updated] = await db
      .update(companies)
      .set({ listId })
      .where(eq(companies.id, companyId))
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

  async updateContact(id: number, updates: Partial<Contact>): Promise<Contact | undefined> {
    const [updated] = await db
      .update(contacts)
      .set({
        ...updates,
        lastEnriched: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
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

  // Campaigns
  async getCampaign(campaignId: number): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.campaignId, campaignId));
    return campaign;
  }

  async listCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns).orderBy(campaigns.campaignId);
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign).returning();
    return created;
  }

  async updateCampaign(id: number, updates: Partial<Campaign>): Promise<Campaign | undefined> {
    const [updated] = await db
      .update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async getNextCampaignId(): Promise<number> {
    const [result] = await db
      .select({ maxCampaignId: max(campaigns.campaignId) })
      .from(campaigns);
    return (result?.maxCampaignId || 2000) + 1;
  }

  // Campaign Lists
  async addListToCampaign(campaignList: InsertCampaignList): Promise<CampaignList> {
    const [created] = await db.insert(campaignLists).values(campaignList).returning();
    await this.updateCampaignTotalCompanies(campaignList.campaignId);
    return created;
  }

  async removeListFromCampaign(campaignId: number, listId: number): Promise<void> {
    await db
      .delete(campaignLists)
      .where(eq(campaignLists.campaignId, campaignId))
      .where(eq(campaignLists.listId, listId));
    await this.updateCampaignTotalCompanies(campaignId);
  }

  async getListsByCampaign(campaignId: number): Promise<List[]> {
    const campaignListsResult = await db
      .select()
      .from(campaignLists)
      .where(eq(campaignLists.campaignId, campaignId));

    const listIds = campaignListsResult.map(cl => cl.listId);

    if (listIds.length === 0) return [];

    return db
      .select()
      .from(lists)
      .where(eq(lists.listId, listIds[0])); // Need to handle multiple listIds
  }

  async updateCampaignTotalCompanies(campaignId: number): Promise<void> {
    const campaignListsResult = await this.getListsByCampaign(campaignId);
    const totalCompanies = campaignListsResult.reduce((sum, list) => sum + list.resultCount, 0);

    await db
      .update(campaigns)
      .set({ totalCompanies })
      .where(eq(campaigns.campaignId, campaignId));
  }

  // Email Templates
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async listEmailTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).orderBy(emailTemplates.createdAt);
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [created] = await db.insert(emailTemplates).values(template).returning();
    return created;
  }

  async updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const [updated] = await db
      .update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // Initialize default search approaches if none exist
  async initializeDefaultSearchApproaches() {
    const existing = await this.listSearchApproaches();
    if (existing.length === 0) {
      const defaultApproaches = [
        { name: "Company Overview", prompt: "Provide a detailed overview of [COMPANY], including its age, size, and main business focus.", order: 1, active: true },
        { name: "Decision-maker Analysis", prompt: "Identify and analyze the key decision-makers at [COMPANY]. Focus on C-level executives, owners, founders, and other top-level decision-makers. Include their roles and any available contact information.", order: 2, active: true },
        { name: "Email Discovery", prompt: "Find contact information and email addresses for leadership and key decision makers at [COMPANY].", order: 3, active: true },
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

  // Initialize default email templates if none exist
  async initializeDefaultEmailTemplates() {
    const existing = await this.listEmailTemplates();
    if (existing.length === 0) {
      const defaultTemplates = [
        {
          name: "Professional Introduction",
          subject: "Exploring Partnership Opportunities with [Company]",
          content: "Dear [Name],\n\nI hope this email finds you well. I came across [Company] and was impressed by your work in [Industry]. I believe there might be some interesting opportunities for collaboration between our organizations.\n\nWould you be open to a brief conversation to explore potential synergies?\n\nBest regards,\n[Your Name]",
          description: "A professional first contact template",
          category: "outreach"
        },
        {
          name: "Follow-up",
          subject: "Following up on our previous conversation",
          content: "Hi [Name],\n\nI wanted to follow up on our previous conversation about [Topic]. Have you had a chance to review the information I shared?\n\nI'm happy to provide any additional details or address any questions you might have.\n\nBest regards,\n[Your Name]",
          description: "A gentle follow-up template",
          category: "follow-up"
        },
        {
          name: "Product Demo Request",
          subject: "Quick demo of our solution for [Company]",
          content: "Hello [Name],\n\nI'd love to show you how our solution could help [Company] with [specific pain point]. Would you be available for a 15-minute demo this week?\n\nI can be flexible with timing to accommodate your schedule.\n\nBest regards,\n[Your Name]",
          description: "Template for requesting a product demo",
          category: "sales"
        }
      ];

      for (const template of defaultTemplates) {
        await this.createEmailTemplate(template);
      }
    }
  }

  // Add new methods for detailed contact search
  async enrichContact(id: number, contactData: Partial<Contact>): Promise<Contact | undefined> {
    const [updated] = await db
      .update(contacts)
      .set({
        ...contactData,
        lastEnriched: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async searchContactDetails(contactInfo: { name: string; company: string }): Promise<Partial<Contact>> {
    // This is just a placeholder - the actual implementation will be in the routes
    // using the Perplexity API for detailed contact searches
    return {};
  }
  async deleteContactsByCompany(companyId: number): Promise<void> {
    await db.delete(contacts).where(eq(contacts.companyId, companyId));
  }

  // New methods for contact validation and feedback
  async addContactFeedback(feedback: InsertContactFeedback): Promise<ContactFeedback> {
    const [created] = await db.insert(contactFeedback).values(feedback).returning();

    // Update the contact's aggregate feedback score
    const allFeedback = await this.getContactFeedback(feedback.contactId);
    const feedbackScores = {
      excellent: 100,
      ok: 50,
      terrible: 0
    };

    const totalScore = allFeedback.reduce((sum, item) =>
      sum + feedbackScores[item.feedbackType as keyof typeof feedbackScores], 0);
    const averageScore = Math.round(totalScore / allFeedback.length);

    await this.updateContact(feedback.contactId, {
      userFeedbackScore: averageScore,
      feedbackCount: allFeedback.length
    });

    return created;
  }

  async getContactFeedback(contactId: number): Promise<ContactFeedback[]> {
    return db
      .select()
      .from(contactFeedback)
      .where(eq(contactFeedback.contactId, contactId))
      .orderBy(contactFeedback.createdAt);
  }

  async updateContactConfidenceScore(id: number, score: number): Promise<Contact | undefined> {
    const [updated] = await db
      .update(contacts)
      .set({
        nameConfidenceScore: score,
        lastValidated: new Date()
      })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async updateContactValidationStatus(id: number): Promise<Contact | undefined> {
    const contact = await this.getContact(id);
    if (!contact) return undefined;

    // Calculate combined score based on AI confidence and user feedback
    const aiScore = contact.nameConfidenceScore || 0;
    const userScore = contact.userFeedbackScore || 0;
    const feedbackCount = contact.feedbackCount || 0;

    // Weight scores based on feedback count
    // As we get more feedback, user scores become more important
    const userWeight = Math.min(feedbackCount * 0.2, 0.8); // Max 80% weight for user feedback
    const aiWeight = 1 - userWeight;

    const combinedScore = Math.round((aiScore * aiWeight) + (userScore * userWeight));

    // Update the contact's probability based on combined score
    return this.updateContact(id, {
      probability: combinedScore
    });
  }
}

export const storage = new DatabaseStorage();

// Initialize default data
Promise.all([
  storage.initializeDefaultSearchApproaches(),
  storage.initializeDefaultEmailTemplates()
]).catch(console.error);