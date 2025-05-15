// Test script for enhanced contact finder
import { findKeyDecisionMakers } from './lib/search-logic/contact-discovery/enhanced-contact-finder';
import type { Contact } from '@shared/schema';

async function runTest() {
  console.log('Starting enhanced contact finder test...');
  
  const companies = [
    'Microsoft',
    'Goldman Sachs',
    'Mayo Clinic'
  ];
  
  for (const company of companies) {
    console.log(`\n--- Testing company: ${company} ---`);
    
    try {
      // Test with industry-specific options
      console.log(`Industry-specific search for ${company}...`);
      const industryContacts = await findKeyDecisionMakers(company, {
        industry: detectIndustry(company),
        useMultipleQueries: true,
        includeMiddleManagement: true,
        maxContacts: 7
      });
      
      console.log(`Found ${industryContacts.length} contacts for ${company}`);
      
      // Print the top contacts
      const topContacts = industryContacts.slice(0, 5);
      topContacts.forEach(contact => {
        console.log(`- ${contact.name}: ${contact.role || 'Unknown'} (Score: ${contact.probability})`);
      });
    } catch (error) {
      console.error(`Error searching for ${company}:`, error);
    }
  }
  
  console.log('\nTest completed.');
}

// Simple industry detector
function detectIndustry(companyName: string): string | undefined {
  const name = companyName.toLowerCase();
  
  if (name.includes('microsoft') || name.includes('tech')) {
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
runTest();