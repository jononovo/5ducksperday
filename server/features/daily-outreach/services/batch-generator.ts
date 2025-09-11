import { db } from '../../../db';
import { 
  contacts, 
  companies, 
  dailyOutreachBatches, 
  dailyOutreachItems,
  strategicProfiles,
  userOutreachPreferences,
  senderProfiles,
  targetCustomerProfiles,
  Contact,
  Company,
  DailyOutreachBatch,
  DailyOutreachItem
} from '@shared/schema';
import { eq, and, isNull, not, inArray, sql, desc } from 'drizzle-orm';
import { DailyBatch, DailyOutreachItemWithDetails } from '../types';
import { generateEmailContent } from '../../../email-content-generation/service';

export class DailyBatchGenerator {
  async generateDailyBatch(userId: number): Promise<DailyBatch | null> {
    try {
      // Get uncontacted contacts with emails
      const uncontactedContacts = await this.getUncontactedContacts(userId);
      
      if (uncontactedContacts.length < 5) {
        // Try to get more contacts from new companies
        const newContacts = await this.getContactsFromNewCompanies(userId, 5 - uncontactedContacts.length);
        uncontactedContacts.push(...newContacts);
      }
      
      if (uncontactedContacts.length < 5) {
        console.log(`Not enough contacts for user ${userId}. Found ${uncontactedContacts.length}`);
        return null;
      }
      
      // Select top 5 based on confidence score
      const selectedContacts = this.selectTopContacts(uncontactedContacts, 5);
      
      // Get company details for selected contacts
      const companyIds = Array.from(new Set(selectedContacts.map(c => c.companyId)));
      const companiesData = await db
        .select()
        .from(companies)
        .where(inArray(companies.id, companyIds));
      
      const companyMap = new Map(companiesData.map(c => [c.id, c]));
      
      // Generate personalized emails for each contact
      const batchItems = await Promise.all(
        selectedContacts.map(contact => 
          this.generateEmailForContact(contact, companyMap.get(contact.companyId)!, userId)
        )
      );
      
      // Create batch record with secure token
      const batch = await this.createBatch(userId, batchItems, selectedContacts, companiesData);
      
      return batch;
    } catch (error) {
      console.error('Error generating daily batch:', error);
      return null;
    }
  }
  
  private async getUncontactedContacts(userId: number): Promise<Contact[]> {
    // Get contacts that haven't been included in any outreach items
    const usedContactIds = await db
      .select({ contactId: dailyOutreachItems.contactId })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachItems.batchId, dailyOutreachBatches.id))
      .where(eq(dailyOutreachBatches.userId, userId));
    
    const usedIds = usedContactIds.map(r => r.contactId);
    
    const query = db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          not(isNull(contacts.email)),
          usedIds.length > 0 ? not(inArray(contacts.id, usedIds)) : sql`true`
        )
      )
      .orderBy(desc(contacts.nameConfidenceScore))
      .limit(20);
    
    return await query;
  }
  
  private async getContactsFromNewCompanies(userId: number, needed: number): Promise<Contact[]> {
    // Get companies that haven't had any contacts used in outreach
    const usedCompanyIds = await db
      .selectDistinct({ companyId: dailyOutreachItems.companyId })
      .from(dailyOutreachItems)
      .innerJoin(dailyOutreachBatches, eq(dailyOutreachItems.batchId, dailyOutreachBatches.id))
      .where(eq(dailyOutreachBatches.userId, userId));
    
    const usedIds = usedCompanyIds.map(r => r.companyId);
    
    // Get contacts from unused companies
    const query = db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.userId, userId),
          not(isNull(contacts.email)),
          usedIds.length > 0 ? not(inArray(contacts.companyId, usedIds)) : sql`true`
        )
      )
      .orderBy(desc(contacts.nameConfidenceScore))
      .limit(needed * 2); // Get extra in case we need them
    
    return await query;
  }
  
  private selectTopContacts(contacts: Contact[], count: number): Contact[] {
    // Sort by confidence score and take top N
    return contacts
      .sort((a, b) => {
        // Prioritize by confidence score, then by having a role
        const scoreA = (a.nameConfidenceScore || 0) + (a.role ? 10 : 0);
        const scoreB = (b.nameConfidenceScore || 0) + (b.role ? 10 : 0);
        return scoreB - scoreA;
      })
      .slice(0, count);
  }
  
  private async generateEmailForContact(
    contact: Contact, 
    company: Company, 
    userId: number
  ): Promise<Omit<DailyOutreachItem, 'id' | 'batchId' | 'createdAt'>> {
    try {
      // Get user's preferences including profile selections
      const [preferences] = await db
        .select()
        .from(userOutreachPreferences)
        .where(eq(userOutreachPreferences.userId, userId));
      
      let strategy;
      if (preferences?.activeProductId) {
        // Get the specific active product
        const [activeProduct] = await db
          .select()
          .from(strategicProfiles)
          .where(eq(strategicProfiles.id, preferences.activeProductId));
        strategy = activeProduct;
      } else {
        // Fallback to most recent strategy
        const [latestStrategy] = await db
          .select()
          .from(strategicProfiles)
          .where(eq(strategicProfiles.userId, userId))
          .orderBy(desc(strategicProfiles.createdAt))
          .limit(1);
        strategy = latestStrategy;
      }

      // Get selected sender profile for personalization
      let senderProfile;
      if (preferences?.activeSenderProfileId) {
        const [activeSender] = await db
          .select()
          .from(senderProfiles)
          .where(eq(senderProfiles.id, preferences.activeSenderProfileId));
        senderProfile = activeSender;
      }

      // Get selected customer profile for targeting
      let customerProfile;
      if (preferences?.activeCustomerProfileId) {
        const [activeCustomer] = await db
          .select()
          .from(targetCustomerProfiles)
          .where(eq(targetCustomerProfiles.id, preferences.activeCustomerProfileId));
        customerProfile = activeCustomer;
      }
      
      // Build enhanced email prompt with profile context
      let emailPrompt = strategy?.productService 
        ? `Introduce ${strategy.productService} to this company and how it can help their business`
        : 'Introduce our services and explore potential collaboration';
        
      if (customerProfile) {
        emailPrompt += `. Target customer profile: ${customerProfile.title}`;
        if (customerProfile.painPoints && customerProfile.painPoints.length > 0) {
          emailPrompt += `. Address these pain points: ${customerProfile.painPoints.join(', ')}`;
        }
      }
      
      if (senderProfile) {
        emailPrompt += `. Email from ${senderProfile.name} at ${senderProfile.companyName || 'our company'}`;
        if (senderProfile.title) {
          emailPrompt += ` (${senderProfile.title})`;
        }
      }

      // Generate email content using existing system with enhanced context
      const emailContent = await generateEmailContent({
        emailPrompt,
        contact: contact,
        company: company,
        userId: userId,
        tone: strategy?.primaryBusinessGoal?.includes('professional') ? 'professional' : 'friendly',
        offerStrategy: 'value_proposition'
      });
      
      return {
        contactId: contact.id,
        companyId: company.id,
        communicationId: null,  // Will be set when email is sent
        emailSubject: emailContent.subject,
        emailBody: emailContent.content,
        emailTone: 'professional',
        status: 'pending',
        sentAt: null,
        editedContent: null
      };
    } catch (error) {
      console.error('Error generating email for contact:', error);
      // Fallback to simple template
      return {
        contactId: contact.id,
        companyId: company.id,
        communicationId: null,  // Will be set when email is sent
        emailSubject: `Quick question for ${company.name}`,
        emailBody: `Hi ${contact.name},\n\nI noticed ${company.name} and wanted to reach out about how we might be able to help with your business needs.\n\nWould you be open to a brief conversation?\n\nBest regards`,
        emailTone: 'professional',
        status: 'pending',
        sentAt: null,
        editedContent: null
      };
    }
  }
  
  private async createBatch(
    userId: number, 
    items: Omit<DailyOutreachItem, 'id' | 'batchId' | 'createdAt'>[],
    selectedContacts: Contact[],
    companiesData: Company[]
  ): Promise<DailyBatch> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Create batch record
    const [batch] = await db
      .insert(dailyOutreachBatches)
      .values({
        userId,
        batchDate: now,
        status: 'pending',
        expiresAt
      })
      .returning();
    
    // Create batch items
    const itemsToInsert = items.map(item => ({
      ...item,
      batchId: batch.id
    }));
    
    const insertedItems = await db
      .insert(dailyOutreachItems)
      .values(itemsToInsert)
      .returning();
    
    // Calculate companies by type
    const companiesByType = this.categorizeCompanies(companiesData);
    
    // Build complete batch object with details
    const itemsWithDetails: DailyOutreachItemWithDetails[] = insertedItems.map((item, index) => ({
      ...item,
      contact: selectedContacts[index],
      company: companiesData.find(c => c.id === item.companyId)!
    }));
    
    return {
      ...batch,
      items: itemsWithDetails,
      hasContacts: true,
      companiesByType
    };
  }
  
  private categorizeCompanies(companies: Company[]): { type: string; count: number }[] {
    const categories = new Map<string, number>();
    
    companies.forEach(company => {
      // Try to categorize based on description or services
      let category = 'Companies';
      
      if (company.description) {
        const desc = company.description.toLowerCase();
        if (desc.includes('software') || desc.includes('saas') || desc.includes('tech')) {
          category = 'Software Companies';
        } else if (desc.includes('marketing') || desc.includes('agency')) {
          category = 'Marketing Agencies';
        } else if (desc.includes('consulting') || desc.includes('services')) {
          category = 'Service Providers';
        } else if (desc.includes('retail') || desc.includes('ecommerce')) {
          category = 'Retail Businesses';
        }
      }
      
      categories.set(category, (categories.get(category) || 0) + 1);
    });
    
    return Array.from(categories.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }
}

export const batchGenerator = new DailyBatchGenerator();