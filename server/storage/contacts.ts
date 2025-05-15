import { PgDatabase } from 'drizzle-orm/pg-core';
import { eq, and, sql } from 'drizzle-orm';
import {
  type Contact,
  type InsertContact,
  contacts
} from '@shared/schema';

export class ContactStorage {
  constructor(private db: PgDatabase<any>) {}

  async getContact(id: number, userId: number): Promise<Contact | undefined> {
    console.log('ContactStorage.getContact called with:', { id, userId });
    try {
      const [contact] = await this.db
        .select()
        .from(contacts)
        .where(and(
          eq(contacts.id, id),
          eq(contacts.userId, userId)
        ));

      console.log('ContactStorage.getContact result:', {
        requested: { id, userId },
        found: contact ? { id: contact.id, name: contact.name } : null
      });

      return contact;
    } catch (error) {
      console.error('Error in ContactStorage.getContact:', error);
      throw error;
    }
  }

  async listContactsByCompany(companyId: number, userId: number): Promise<Contact[]> {
    try {
      console.log('ContactStorage.listContactsByCompany called with:', { companyId, userId });
      
      const results = await this.db
        .select()
        .from(contacts)
        .where(and(
          eq(contacts.companyId, companyId),
          eq(contacts.userId, userId)
        ));
        
      console.log('ContactStorage.listContactsByCompany result count:', results.length);
      return results;
    } catch (error) {
      console.error('Error in ContactStorage.listContactsByCompany:', error);
      throw error;
    }
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    try {
      const [created] = await this.db.insert(contacts).values([contact]).returning();
      return created;
    } catch (error) {
      console.error('Error in ContactStorage.createContact:', error);
      throw error;
    }
  }

  async updateContact(
    id: number,
    updates: Partial<Contact>,
    userId?: number
  ): Promise<Contact | undefined> {
    try {
      console.log('ContactStorage.updateContact called with:', { id, updates, userId });
      
      const query = this.db
        .update(contacts)
        .set({
          ...updates,
          lastEnriched: new Date(),
        });
        
      // Add userId check if provided
      if (userId !== undefined) {
        query.where(and(
          eq(contacts.id, id),
          eq(contacts.userId, userId)
        ));
      } else {
        query.where(eq(contacts.id, id));
      }
      
      const [updated] = await query.returning();
      return updated;
    } catch (error) {
      console.error('Error in ContactStorage.updateContact:', error);
      throw error;
    }
  }

  async deleteContactsByCompany(companyId: number, userId: number): Promise<void> {
    console.log('ContactStorage.deleteContactsByCompany called with:', { companyId, userId });
    
    await this.db
      .delete(contacts)
      .where(and(
        eq(contacts.companyId, companyId),
        eq(contacts.userId, userId)
      ));
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
    userId: number
  ): Promise<Contact | undefined> {
    const contact = await this.getContact(id, userId);
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
    }, userId);
  }

  async updateContactWithAeroLeadsResult(
    id: number,
    result: { email: string | null; confidence: number },
    userId?: number
  ): Promise<Contact | undefined> {
    const appendSearchSql = sql`array_append(COALESCE(${contacts.completedSearches}, ARRAY[]::text[]), 'aeroleads_search')`;
    
    try {
      // Create base query
      let query = this.db.update(contacts);
      
      // Set the appropriate fields based on whether we have an email
      if (!result.email) {
        query = query.set({
          completedSearches: appendSearchSql
        });
      } else {
        query = query.set({
          email: result.email,
          // Use nameConfidenceScore since we don't have a separate email confidence column
          nameConfidenceScore: result.confidence,
          completedSearches: appendSearchSql,
          lastValidated: new Date(),
        });
      }
      
      // Add userId check if provided for security
      if (userId !== undefined) {
        query = query.where(and(
          eq(contacts.id, id),
          eq(contacts.userId, userId)
        ));
      } else {
        query = query.where(eq(contacts.id, id));
      }
      
      const [updated] = await query.returning();
      return updated;
    } catch (error) {
      console.error('Error in ContactStorage.updateContactWithAeroLeadsResult:', error);
      throw error;
    }
  }
}