#!/usr/bin/env tsx

/**
 * Demo Data Setup Script
 * 
 * This script sets up essential demo data for a fresh 5Ducks clone:
 * - Demo user (ID: 1) for backwards compatibility
 * - 4 professional default email templates for all users
 * 
 * Usage: npm run setup-demo
 */

import { db } from '../server/db.js';
import { users, emailTemplates } from '../shared/schema.js';
import { eq } from 'drizzle-orm';

async function setupDemoData() {
  console.log('🦆 Setting up 5Ducks demo data...\n');

  try {
    // Check if demo user already exists
    const existingUser = await db.select().from(users).where(eq(users.id, 1)).limit(1);
    
    if (existingUser.length === 0) {
      // Create demo user (ID: 1) for non-registered user functionality
      await db.insert(users).values({
        id: 1,
        email: 'demo@5ducks.ai',
        username: 'Demo User',
        password: 'demo', // Not used for guest accounts
        createdAt: new Date()
      }).onConflictDoNothing();
      
      console.log('✅ Created demo user (ID: 1) for non-registered users');
    } else {
      console.log('✅ Demo user already exists');
    }

    // Check if default templates already exist
    const existingTemplates = await db.select().from(emailTemplates).where(eq(emailTemplates.isDefault, true));
    
    if (existingTemplates.length === 0) {
      // Create 4 professional default email templates
      const defaultTemplates = [
        {
          userId: 1,  // Still use demo user ID for backwards compatibility
          name: 'Cold Outreach - Introduction',
          subject: 'Quick question about {{contact_company_name}}',
          content: `Hi {{contact_name}},

I hope this email finds you well. I came across {{contact_company_name}} and was impressed by your work in the industry.

[Your message here]

Best regards,
{{full_sender_name}}`,
          description: 'Initial cold outreach template',
          category: 'outreach',
          isDefault: true
        },
        {
          userId: 1,
          name: 'Follow-up Email', 
          subject: 'Following up on {{contact_company_name}}',
          content: `Hi {{contact_name}},

I wanted to follow up on my previous email regarding {{contact_company_name}}.

[Your follow-up message]

Looking forward to hearing from you.

Best,
{{full_sender_name}}`,
          description: 'Follow-up after initial outreach',
          category: 'follow-up',
          isDefault: true
        },
        {
          userId: 1,
          name: 'Partnership Inquiry',
          subject: 'Partnership opportunity with {{contact_company_name}}',
          content: `Dear {{contact_name}},

I'm reaching out to explore potential partnership opportunities between our companies.

[Partnership details]

Would you be open to a brief conversation?

Best regards,
{{full_sender_name}}`,
          description: 'Partnership proposal template',
          category: 'partnership',
          isDefault: true
        },
        {
          userId: 1,
          name: 'Service Introduction',
          subject: 'How we can help {{contact_company_name}}',
          content: `Hi {{contact_name}},

I noticed that {{contact_company_name}} might benefit from our services.

[Service description]

Would you be interested in learning more?

Best,
{{full_sender_name}}`,
          description: 'Service introduction template',
          category: 'introduction',
          isDefault: true
        }
      ];

      await db.insert(emailTemplates).values(defaultTemplates);
      console.log('✅ Created 4 professional default email templates (available to all users)');
    } else {
      console.log('✅ Default email templates already exist');
    }

    console.log('\n🎉 Demo data setup complete!');
    console.log('\nFeatures now available:');
    console.log('  • Demo user created for backwards compatibility (user ID: 1)');
    console.log('  • 4 professional default email templates available to all users');
    console.log('  • Templates are now cached for better performance');
    console.log('  • Default templates are protected from editing/deletion');

  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupDemoData();