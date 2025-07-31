#!/usr/bin/env tsx

/**
 * Demo Data Setup Script
 * 
 * This script sets up essential demo data for a fresh 5Ducks clone:
 * - Demo user (ID: 1) for non-registered user functionality
 * - 4 professional email templates for outreach system
 * 
 * Usage: npm run setup-demo
 */

import { db } from '../server/1--db.js';
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

    // Check if demo templates already exist
    const existingTemplates = await db.select().from(emailTemplates).where(eq(emailTemplates.userId, 1));
    
    if (existingTemplates.length === 0) {
      // Create 4 professional demo email templates
      const demoTemplates = [
        {
          userId: 1,
          name: 'Cold Outreach',
          subject: 'Quick question about {{company_name}}',
          content: `Hi {{contact_name}},

I hope this email finds you well. I came across {{company_name}} and was impressed by your work in the industry.

[Your message here]

Best regards,
{{sender_name}}`
        },
        {
          userId: 1,
          name: 'Follow-up Email', 
          subject: 'Following up on {{company_name}}',
          content: `Hi {{contact_name}},

I wanted to follow up on my previous email regarding {{company_name}}.

[Your follow-up message]

Looking forward to hearing from you.

Best,
{{sender_name}}`
        },
        {
          userId: 1,
          name: 'Partnership Inquiry',
          subject: 'Partnership opportunity with {{company_name}}',
          content: `Dear {{contact_name}},

I'm reaching out to explore potential partnership opportunities between our companies.

[Partnership details]

Would you be open to a brief conversation?

Best regards,
{{sender_name}}`
        },
        {
          userId: 1,
          name: 'Service Introduction',
          subject: 'How we can help {{company_name}}',
          content: `Hi {{contact_name}},

I noticed that {{company_name}} might benefit from our services.

[Service description]

Would you be interested in learning more?

Best,
{{sender_name}}`
        }
      ];

      await db.insert(emailTemplates).values(demoTemplates);
      console.log('✅ Created 4 professional email templates');
    } else {
      console.log('✅ Demo email templates already exist');
    }

    console.log('\n🎉 Demo data setup complete!');
    console.log('\nFeatures now available:');
    console.log('  • Non-registered users can save searches (user ID: 1)');
    console.log('  • Professional email templates in Quick Templates section');
    console.log('  • Full search and outreach functionality');

  } catch (error) {
    console.error('❌ Error setting up demo data:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupDemoData();