import { PgDatabase } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import {
  type Contact,
  type InsertContact,
  type ContactFeedback,
  type InsertContactFeedback,
  contacts,
  contactFeedback
} from '@shared/schema';

export class ContactStorage {
  constructor(private db: PgDatabase<any>) {}

  async getContact(id: number): Promise<Contact | undefined> {
    const [contact] = await this.db
      .select()
      .from(contacts)
      .where(eq(contacts.id, id));
    return contact;
  }

  async listContactsByCompany(companyId: number): Promise<Contact[]> {
    return this.db.select().from(contacts).where(eq(contacts.companyId, companyId));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await this.db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(
    id: number,
    updates: Partial<Contact>,
  ): Promise<Contact | undefined> {
    const [updated] = await this.db
      .update(contacts)
      .set({
        ...updates,
        lastEnriched: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async deleteContactsByCompany(companyId: number): Promise<void> {
    await this.db.delete(contacts).where(eq(contacts.companyId, companyId));
  }

  async enrichContact(
    id: number,
    contactData: Partial<Contact>,
  ): Promise<Contact | undefined> {
    const [updated] = await this.db
      .update(contacts)
      .set({
        ...contactData,
        lastEnriched: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async searchContactDetails(contactInfo: {
    name: string;
    company: string;
  }): Promise<Partial<Contact>> {
    // Placeholder for Perplexity API implementation
    return {};
  }

  async addContactFeedback(feedback: InsertContactFeedback): Promise<ContactFeedback> {
    const [created] = await this.db
      .insert(contactFeedback)
      .values(feedback)
      .returning();

    const allFeedback = await this.getContactFeedback(feedback.contactId);
    const feedbackScores = {
      excellent: 100,
      ok: 50,
      terrible: 0,
    };

    const totalScore = allFeedback.reduce(
      (sum, item) =>
        sum + feedbackScores[item.feedbackType as keyof typeof feedbackScores],
      0,
    );
    const averageScore = Math.round(totalScore / allFeedback.length);

    await this.updateContact(feedback.contactId, {
      userFeedbackScore: averageScore,
      feedbackCount: allFeedback.length,
    });

    return created;
  }

  async getContactFeedback(contactId: number): Promise<ContactFeedback[]> {
    return this.db
      .select()
      .from(contactFeedback)
      .where(eq(contactFeedback.contactId, contactId))
      .orderBy(contactFeedback.createdAt);
  }

  async updateContactConfidenceScore(
    id: number,
    score: number,
  ): Promise<Contact | undefined> {
    const [updated] = await this.db
      .update(contacts)
      .set({
        nameConfidenceScore: score,
        lastValidated: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }

  async updateContactValidationStatus(
    id: number,
  ): Promise<Contact | undefined> {
    const contact = await this.getContact(id);
    if (!contact) return undefined;

    const aiScore = contact.nameConfidenceScore || 0;
    const userScore = contact.userFeedbackScore || 0;
    const feedbackCount = contact.feedbackCount || 0;

    const userWeight = Math.min(feedbackCount * 0.2, 0.8);
    const aiWeight = 1 - userWeight;

    const combinedScore = Math.round(
      aiScore * aiWeight + userScore * userWeight,
    );

    return this.updateContact(id, {
      probability: combinedScore,
    });
  }

  async updateContactWithAeroLeadsResult(
    id: number,
    result: { email: string | null; confidence: number }
  ): Promise<Contact | undefined> {
    if (!result.email) {
      const [updated] = await this.db
        .update(contacts)
        .set({
          completedSearches: this.db.raw(
            'array_append(COALESCE("completedSearches", ARRAY[]::text[]), ?)',
            ['aeroleads_search']
          ),
        })
        .where(eq(contacts.id, id))
        .returning();
      return updated;
    }

    const [updated] = await this.db
      .update(contacts)
      .set({
        email: result.email,
        emailConfidenceScore: result.confidence,
        completedSearches: this.db.raw(
          'array_append(COALESCE("completedSearches", ARRAY[]::text[]), ?)',
          ['aeroleads_search']
        ),
        lastValidated: new Date(),
      })
      .where(eq(contacts.id, id))
      .returning();
    return updated;
  }
}