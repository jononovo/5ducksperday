import { db } from '../../db';
import { eq, and, or, desc } from 'drizzle-orm';
import {
  type EmailTemplate,
  type InsertEmailTemplate,
  emailTemplates
} from '@shared/schema';
import type { EmailTemplatesService } from './types';

export class EmailTemplatesServiceImpl implements EmailTemplatesService {
  async listTemplates(userId: number): Promise<EmailTemplate[]> {
    console.log('EmailTemplatesService.listTemplates called for userId:', userId);
    
    // Fetch both default templates and user's personal templates
    console.log(`Fetching default templates and user templates for userId=${userId}`);
    return db
      .select()
      .from(emailTemplates)
      .where(or(
        eq(emailTemplates.isDefault, true),  // Default templates (marked as defaults)
        and(
          eq(emailTemplates.userId, userId),  // User's personal templates
          eq(emailTemplates.isDefault, false)
        )
      ))
      .orderBy(desc(emailTemplates.isDefault), emailTemplates.createdAt);  // Show defaults first
  }

  async getTemplate(id: number, userId: number): Promise<EmailTemplate | undefined> {
    console.log('EmailTemplatesService.getTemplate called with:', { id, userId });
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(or(
        and(eq(emailTemplates.id, id), eq(emailTemplates.isDefault, true)),  // Allow fetching default templates
        and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId))  // Or user's own templates
      ));
    return template;
  }

  async createTemplate(data: InsertEmailTemplate): Promise<EmailTemplate> {
    console.log('EmailTemplatesService.createTemplate called with:', {
      name: data.name,
      userId: data.userId
    });
    
    const [template] = await db
      .insert(emailTemplates)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    console.log('EmailTemplatesService: Created email template:', {
      id: template.id,
      name: template.name,
      userId: template.userId
    });
    
    return template;
  }

  async updateTemplate(
    id: number, 
    data: Partial<EmailTemplate>, 
    userId: number
  ): Promise<EmailTemplate | undefined> {
    console.log('EmailTemplatesService.updateTemplate called with:', {
      id,
      userId,
      updates: data
    });
    
    // Only allow updating user's own templates, not default templates
    const [template] = await db
      .update(emailTemplates)
      .set({
        ...data,
        isDefault: false,  // Ensure user templates are never marked as default
        updatedAt: new Date()
      })
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId),
        eq(emailTemplates.isDefault, false)  // Can't update default templates
      ))
      .returning();
    
    console.log('EmailTemplatesService: Updated email template:', {
      id: template?.id,
      name: template?.name,
      userId: template?.userId
    });
    
    return template;
  }

  async deleteTemplate(id: number, userId: number): Promise<void> {
    console.log('EmailTemplatesService.deleteTemplate called with:', { id, userId });
    // Only allow deleting user's own templates, not default templates
    await db
      .delete(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.userId, userId),
        eq(emailTemplates.isDefault, false)  // Can't delete default templates
      ));
  }
}

// Export a singleton instance
export const emailTemplatesService = new EmailTemplatesServiceImpl();