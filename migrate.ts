import { db } from './server/db';
import { storage as replitStorage } from './server/storage-replit';
import { 
  users, lists, companies, contacts, campaigns, 
  campaignLists, emailTemplates, searchApproaches, 
  userPreferences, searchTestResults, webhookLogs
} from '@shared/schema';

/**
 * Utility script to migrate data from PostgreSQL to Replit DB
 */
async function migrateToReplitDb() {
  console.log('Starting migration from PostgreSQL to Replit DB...');
  
  try {
    // Extract all data from PostgreSQL
    console.log('Extracting data from PostgreSQL...');
    
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users`);
    
    const allUserPrefs = await db.select().from(userPreferences);
    console.log(`Found ${allUserPrefs.length} user preferences`);
    
    const allLists = await db.select().from(lists);
    console.log(`Found ${allLists.length} lists`);
    
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies`);
    
    const allContacts = await db.select().from(contacts);
    console.log(`Found ${allContacts.length} contacts`);
    
    const allCampaigns = await db.select().from(campaigns);
    console.log(`Found ${allCampaigns.length} campaigns`);
    
    const allCampaignLists = await db.select().from(campaignLists);
    console.log(`Found ${allCampaignLists.length} campaign lists`);
    
    const allEmailTemplates = await db.select().from(emailTemplates);
    console.log(`Found ${allEmailTemplates.length} email templates`);
    
    const allSearchApproaches = await db.select().from(searchApproaches);
    console.log(`Found ${allSearchApproaches.length} search approaches`);
    
    const allSearchTestResults = await db.select().from(searchTestResults);
    console.log(`Found ${allSearchTestResults.length} search test results`);
    
    const allWebhookLogs = await db.select().from(webhookLogs);
    console.log(`Found ${allWebhookLogs.length} webhook logs`);
    
    // Migrate to Replit DB
    console.log('Migrating data to Replit DB...');
    await replitStorage.migrateFromPostgres({
      users: allUsers,
      userPreferences: allUserPrefs,
      lists: allLists,
      companies: allCompanies,
      contacts: allContacts,
      campaigns: allCampaigns,
      campaignLists: allCampaignLists,
      emailTemplates: allEmailTemplates,
      searchApproaches: allSearchApproaches,
      searchTestResults: allSearchTestResults,
      webhookLogs: allWebhookLogs
    });
    
    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
  
  process.exit(0);
}

migrateToReplitDb();