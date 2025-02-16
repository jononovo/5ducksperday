import { PgDatabase } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import {
  type EmailTemplate,
  type InsertEmailTemplate,
  emailTemplates
} from '@shared/schema';

export class TemplateStorage {
  constructor(private db: PgDatabase<any>) {}

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await this.db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return template;
  }

  async listEmailTemplates(): Promise<EmailTemplate[]> {
    return this.db.select().from(emailTemplates).orderBy(emailTemplates.createdAt);
  }

  async createEmailTemplate(
    template: InsertEmailTemplate,
  ): Promise<EmailTemplate> {
    const [created] = await this.db
      .insert(emailTemplates)
      .values(template)
      .returning();
    return created;
  }

  async updateEmailTemplate(
    id: number,
    updates: Partial<EmailTemplate>,
  ): Promise<EmailTemplate | undefined> {
    const [updated] = await this.db
      .update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: number): Promise<void> {
    await this.db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  async initializeDefaultEmailTemplates() {
    const existing = await this.listEmailTemplates();
    if (existing.length === 0) {
      const defaultTemplates = [
        {
          name: "Professional Introduction",
          subject: "Exploring Partnership Opportunities with [Company]",
          content:
            "Dear [Name],\n\nI hope this email finds you well. I came across [Company] and was impressed by your work in [Industry]. I believe there might be some interesting opportunities for collaboration between our organizations.\n\nWould you be open to a brief conversation to explore potential synergies?\n\nBest regards,\n[Your Name]",
          description: "A professional first contact template",
          category: "outreach",
        },
        {
          name: "Follow-up",
          subject: "Following up on our previous conversation",
          content:
            "Hi [Name],\n\nI wanted to follow up on our previous conversation about [Topic]. Have you had a chance to review the information I shared?\n\nI'm happy to provide any additional details or address any questions you might have.\n\nBest regards,\n[Your Name]",
          description: "A gentle follow-up template",
          category: "follow-up",
        },
        {
          name: "Product Demo Request",
          subject: "Quick demo of our solution for [Company]",
          content:
            "Hello [Name],\n\nI'd love to show you how our solution could help [Company] with [specific pain point]. Would you be available for a 15-minute demo this week?\n\nI can be flexible with timing to accommodate your schedule.\n\nBest regards,\n[Your Name]",
          description: "Template for requesting a product demo",
          category: "sales",
        },
      ];

      for (const template of defaultTemplates) {
        await this.createEmailTemplate(template);
      }
    }
  }
}