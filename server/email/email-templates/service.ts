import { db } from '../../1--db';
import { eq, and, or } from 'drizzle-orm';
import {
  type EmailTemplate,
  type InsertEmailTemplate,
  emailTemplates
} from '@shared/schema';
import type { EmailTemplatesService } from './types';

export class EmailTemplatesServiceImpl implements EmailTemplatesService {
  async listTemplates(userId: number): Promise<EmailTemplate[]> {
    console.log('EmailTemplatesService.listTemplates called for userId:', userId);
    
    // If this is not userId=1, get both the default templates and the user's templates
    if (userId !== 1) {
      console.log(`Fetching both default templates (userId=1) and user templates (userId=${userId})`);
      return db
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
    return db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(emailTemplates.createdAt);
  }

  async getTemplate(id: number, userId: number): Promise<EmailTemplate | undefined> {
    console.log('EmailTemplatesService.getTemplate called with:', { id, userId });
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
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
    
    const [template] = await db
      .update(emailTemplates)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(emailTemplates.id, id))
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
    await db
      .delete(emailTemplates)
      .where(and(eq(emailTemplates.id, id), eq(emailTemplates.userId, userId)));
  }
}

// Export a singleton instance
export const emailTemplatesService = new EmailTemplatesServiceImpl();