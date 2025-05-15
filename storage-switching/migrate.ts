/**
 * Utility script to migrate data from PostgreSQL to Replit DB
 */
import { storage as pgStorage } from '../server/storage/database';
import { storage as replitStorage } from './simplified-storage-replit';

async function migrateToReplitDb() {
  console.log('Starting migration from PostgreSQL to Replit DB...');
  
  try {
    // 1. Fetch all data from PostgreSQL
    console.log('Step 1: Fetching data from PostgreSQL...');
    
    // Users
    const users = await pgStorage.listUsers();
    console.log(`Found ${users.length} users`);
    
    // Lists
    let lists: any[] = [];
    for (const user of users) {
      const userLists = await pgStorage.listLists(user.id);
      lists = [...lists, ...userLists];
    }
    console.log(`Found ${lists.length} lists`);
    
    // Companies
    const companies = await pgStorage.listCompanies();
    console.log(`Found ${companies.length} companies`);
    
    // Contacts
    let contacts: any[] = [];
    for (const company of companies) {
      const companyContacts = await pgStorage.listContactsByCompany(company.id);
      contacts = [...contacts, ...companyContacts];
    }
    console.log(`Found ${contacts.length} contacts`);
    
    // User Preferences
    const userPreferences: any[] = [];
    for (const user of users) {
      const prefs = await pgStorage.getUserPreferences(user.id);
      if (prefs) userPreferences.push(prefs);
    }
    console.log(`Found ${userPreferences.length} user preferences`);
    
    // Email Templates
    let emailTemplates: any[] = [];
    for (const user of users) {
      const templates = await pgStorage.listEmailTemplates(user.id);
      emailTemplates = [...emailTemplates, ...templates];
    }
    console.log(`Found ${emailTemplates.length} email templates`);
    
    // Search Approaches
    const searchApproaches = await pgStorage.listSearchApproaches();
    console.log(`Found ${searchApproaches.length} search approaches`);
    
    // Campaigns
    let campaigns: any[] = [];
    let campaignLists: any[] = [];
    for (const user of users) {
      const userCampaigns = await pgStorage.listCampaigns(user.id);
      campaigns = [...campaigns, ...userCampaigns];
      
      // Campaign Lists
      for (const campaign of userCampaigns) {
        const lists = await pgStorage.getListsByCampaign(campaign.id);
        for (const list of lists) {
          campaignLists.push({
            id: campaignLists.length + 1, // Generate a new ID
            campaignId: campaign.id,
            listId: list.id,
            createdAt: new Date()
          });
        }
      }
    }
    console.log(`Found ${campaigns.length} campaigns`);
    console.log(`Found ${campaignLists.length} campaign lists`);
    
    // Search Test Results
    let searchTestResults: any[] = [];
    for (const user of users) {
      const results = await pgStorage.listSearchTestResults(user.id);
      searchTestResults = [...searchTestResults, ...results];
    }
    console.log(`Found ${searchTestResults.length} search test results`);
    
    // 2. Migrate data to Replit DB
    console.log('\nStep 2: Migrating data to Replit DB...');
    await replitStorage.migrateFromPostgres({
      users,
      lists,
      companies,
      contacts,
      campaigns,
      campaignLists,
      emailTemplates,
      searchApproaches,
      userPreferences,
      searchTestResults
    });
    
    console.log('\nMigration completed successfully!');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateToReplitDb();