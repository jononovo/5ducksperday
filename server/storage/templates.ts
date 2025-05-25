import { PgDatabase } from 'drizzle-orm/pg-core';
import { eq, and, or } from 'drizzle-orm';
import {
  type EmailTemplate,
  type InsertEmailTemplate,
  emailTemplates
} from '@shared/schema';

export class TemplateStorage {
  constructor(private db: PgDatabase<any>) {}

  async getEmailTemplate(id: number, userId: number): Promise<EmailTemplate | undefined> {
    console.log('TemplateStorage.getEmailTemplate called with:', { id, userId });
    const [template] = await this.db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
    return template;
  }

  async listEmailTemplates(userId: number): Promise<EmailTemplate[]> {
    console.log('TemplateStorage.listEmailTemplates called for userId:', userId);
    
    // If this is not userId=1, get both the default templates and the user's templates
    if (userId !== 1) {
      console.log(`Fetching both default templates (userId=1) and user templates (userId=${userId})`);
      return this.db
        .select()
        .from(emailTemplates)
        .where(or(
          eq(emailTemplates.userId, 1),  // Default templates (userId=1)
          eq(emailTemplates.userId, userId)  // User's personal templates
        ))
        .orderBy(emailTemplates.createdAt);
    }
    
    // If it is userId=1, just return their templates (which are the defaults)
    console.log('Fetching only templates for userId=1 (defaults)');
    return this.db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(emailTemplates.createdAt);
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    console.log('TemplateStorage.createEmailTemplate called with:', {
      name: template.name,
      userId: template.userId
    });
    const [created] = await this.db
      .insert(emailTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updateEmailTemplate(
    id: number,
    updates: Partial<EmailTemplate>,
    userId: number
  ): Promise<EmailTemplate | undefined> {
    const [updated] = await this.db
      .update(emailTemplates)
      .set(updates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: number, userId: number): Promise<void> {
    await this.db
      .delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
  }

  async initializeDefaultEmailTemplates(userId: number) {
    console.log('TemplateStorage.initializeDefaultEmailTemplates for userId:', userId);
    const existing = await this.listEmailTemplates(userId);
    if (existing.length === 0) {
      const defaultTemplates = [
        {
          name: "Professional Introduction",
          subject: "Exploring Partnership Opportunities with [Company]",
          content:
            "Dear [Name],\n\nI hope this email finds you well. I came across [Company] and was impressed by your work in [Industry]. I believe there might be some interesting opportunities for collaboration between our organizations.\n\nWould you be open to a brief conversation to explore potential synergies?\n\nBest regards,\n[Your Name]",
          description: "A professional first contact template",
          category: "outreach",
          userId: userId,
        },
        {
          name: "Follow-up",
          subject: "Following up on our previous conversation",
          content:
            "Hi [Name],\n\nI wanted to follow up on our previous conversation about [Topic]. Have you had a chance to review the information I shared?\n\nI'm happy to provide any additional details or address any questions you might have.\n\nBest regards,\n[Your Name]",
          description: "A gentle follow-up template",
          category: "follow-up",
          userId: userId,
        },
        {
          name: "Product Demo Request",
          subject: "Quick demo of our solution for [Company]",
          content:
            "Hello [Name],\n\nI'd love to show you how our solution could help [Company] with [specific pain point]. Would you be available for a 15-minute demo this week?\n\nI can be flexible with timing to accommodate your schedule.\n\nBest regards,\n[Your Name]",
          description: "Template for requesting a product demo",
          category: "sales",
          userId: userId,
        },
      ];

      for (const template of defaultTemplates) {
        await this.createEmailTemplate(template);
      }
    }
  }
}