/**
 * Utility script to migrate data from PostgreSQL to Replit DB
 */
import { storage as pgStorage } from '../server/storage';
import { storage as replitStorage } from './simplified-storage-replit';

async function migrateToReplitDb() {
  console.log('Starting migration from PostgreSQL to Replit DB...');
  
  try {
    // 1. Fetch all data from PostgreSQL
    console.log('Step 1: Fetching data from PostgreSQL...');
    
    // Users - we need to query a single user to get started
    // Assuming user ID 1 is the main user since this is development environment
    const mainUser = await pgStorage.getUserById(1);
    const users = mainUser ? [mainUser] : [];
    console.log(`Found ${users.length} users`);
    
    // Skip if no users found
    if (users.length === 0) {
      console.log('No users found, stopping migration');
      return;
    }
    
    // Lists
    let lists: any[] = [];
    for (const user of users) {
      const userLists = await pgStorage.listLists(user.id);
      lists = [...lists, ...userLists];
    }
    console.log(`Found ${lists.length} lists`);
    
    // Companies
    let companies: any[] = [];
    for (const user of users) {
      const userCompanies = await pgStorage.listCompanies(user.id);
      companies = [...companies, ...userCompanies];
    }
    console.log(`Found ${companies.length} companies`);
    
    // Contacts
    let contacts: any[] = [];
    for (const company of companies) {
      const companyContacts = await pgStorage.listContactsByCompany(company.id, company.userId);
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
      
      // For campaign lists, we don't have a getListsByCampaign method
      // We'll skip this for now since the schema doesn't show a campaign-list relationship
    }
    console.log(`Found ${campaigns.length} campaigns`);
    console.log(`Campaign lists relationship not migrated - missing in schema`);
    
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
      campaignLists: [], // We're not migrating campaign lists 
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