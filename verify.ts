import { storage } from './server/storage-replit';

// Function to safely list keys
async function listKeys(prefix: string): Promise<string[]> {
  try {
    // @ts-ignore: Accessing private method for verification only
    return await storage.list(prefix);
  } catch (err) {
    console.error(`Error listing keys with prefix ${prefix}:`, err);
    return [];
  }
}

/**
 * Utility script to verify data migration
 */
async function verifyMigration() {
  console.log('Verifying Replit DB migration...');
  
  try {
    // Check users
    const userKeys = await listKeys('user:');
    console.log(`Found ${userKeys.length} user records`);
    
    if (userKeys.length > 0) {
      const randomUserKey = userKeys[Math.floor(Math.random() * userKeys.length)];
      const userId = parseInt(randomUserKey.replace('user:', ''));
      const user = await storage.getUserById(userId);
      console.log(`Sample user: ${user?.username} (${user?.email})`);
      
      // Check user preferences
      const userPrefs = await storage.getUserPreferences(userId);
      console.log(`User preferences: ${userPrefs ? 'Found' : 'Not found'}`);
      
      // Check lists
      const lists = await storage.listLists(userId);
      console.log(`User has ${lists.length} lists`);
      
      // Check companies
      const companies = await storage.listCompanies(userId);
      console.log(`User has ${companies.length} companies`);
      
      if (companies.length > 0) {
        // Check contacts
        const companyId = companies[0].id;
        const contacts = await storage.listContactsByCompany(companyId, userId);
        console.log(`Company #${companyId} has ${contacts.length} contacts`);
      }
      
      // Check campaigns
      const campaigns = await storage.listCampaigns(userId);
      console.log(`User has ${campaigns.length} campaigns`);
      
      // Check email templates
      const templates = await storage.listEmailTemplates(userId);
      console.log(`User has ${templates.length} email templates`);
    }
    
    // Check search approaches
    const approaches = await storage.listSearchApproaches();
    console.log(`Found ${approaches.length} search approaches`);
    
    console.log('Verification completed successfully!');
  } catch (err) {
    console.error('Verification failed:', err);
    process.exit(1);
  }
  
  process.exit(0);
}

verifyMigration();