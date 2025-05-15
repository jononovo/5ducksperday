// Test script for enhanced contact finder
import { findKeyDecisionMakers } from './server/lib/search-logic/contact-discovery/enhanced-contact-finder.js';

async function runTest() {
  console.log('Starting enhanced contact finder test...');
  
  const companies = [
    'Microsoft',
    'Amazon',
    'Tesla',
    'Goldman Sachs',
    'Mayo Clinic'
  ];
  
  for (const company of companies) {
    console.log(`\n--- Testing company: ${company} ---`);
    
    // Test with default options
    console.log(`Standard search for ${company}...`);
    const contacts = await findKeyDecisionMakers(company);
    console.log(`Found ${contacts.length} contacts.`);
    
    // Print the first 3 contacts or all if less than 3
    const topContacts = contacts.slice(0, 3);
    topContacts.forEach(contact => {
      console.log(`- ${contact.name}: ${contact.role || 'Unknown'} (Score: ${contact.probability})`);
    });
    
    // Test with industry-specific options
    console.log(`\nIndustry-specific search for ${company}...`);
    const industryContacts = await findKeyDecisionMakers(company, {
      industry: detectIndustry(company),
      useMultipleQueries: true,
      includeMiddleManagement: true
    });
    console.log(`Found ${industryContacts.length} contacts with industry context.`);
    
    // Print the first 3 contacts or all if less than 3
    const topIndustryContacts = industryContacts.slice(0, 3);
    topIndustryContacts.forEach(contact => {
      console.log(`- ${contact.name}: ${contact.role || 'Unknown'} (Score: ${contact.probability})`);
    });
  }
}

// Simple industry detector
function detectIndustry(companyName) {
  const name = companyName.toLowerCase();
  
  if (name.includes('microsoft') || name.includes('amazon') || name.includes('tech')) {
    return 'technology';
  } else if (name.includes('goldman') || name.includes('bank') || name.includes('financial')) {
    return 'financial';
  } else if (name.includes('clinic') || name.includes('hospital') || name.includes('health')) {
    return 'healthcare';
  } else if (name.includes('tesla') || name.includes('motors')) {
    return 'manufacturing';
  }
  
  return undefined;
}

// Run the test
runTest().then(() => {
  console.log('\nTest completed.');
}).catch(error => {
  console.error('Error running test:', error);
});