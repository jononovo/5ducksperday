#!/usr/bin/env tsx
/**
 * Test the parallel email search to see what's happening with Apollo
 */

import { parallelTieredEmailSearch } from './search/services/parallel-email-search';
import { storage } from './storage';

async function testParallelSearch() {
  console.log('\n=== Testing Parallel Email Search ===\n');
  
  // Test data - real companies and contacts from the database
  const testCases = [
    {
      company: {
        id: 1799,
        name: 'ConsenSys',
        website: 'consensys.net'
      },
      contacts: [
        {
          id: 17369,
          name: 'Joseph Lubin',
          role: 'Founder and Chief Executive Officer (CEO)',
          probability: 89,
          email: null
        },
        {
          id: 17370, 
          name: 'Amanda Keleher',
          role: 'Chief People Officer',
          probability: 86,
          email: null
        }
      ]
    },
    {
      company: {
        id: 1798,
        name: 'Teamshares, Inc',
        website: 'teamshares.com'
      },
      contacts: [
        {
          id: 17383,
          name: 'Ebony Williams',
          role: 'President & Chief Executive Officer',
          probability: 89,
          email: null
        },
        {
          id: 17384,
          name: 'Alex Eu', 
          role: 'Co-Founder',
          probability: 89,
          email: null
        }
      ]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📧 Testing company: ${testCase.company.name}`);
    console.log(`   Website: ${testCase.company.website}`);
    console.log(`   Contacts: ${testCase.contacts.map(c => c.name).join(', ')}`);
    
    try {
      const results = await parallelTieredEmailSearch(
        testCase.contacts,
        testCase.company,
        1 // userId
      );
      
      console.log(`\n   Results found: ${results.length}`);
      for (const result of results) {
        const contact = testCase.contacts.find(c => c.id === result.contactId);
        console.log(`   - ${contact?.name}: ${result.email || 'NO EMAIL'} (source: ${result.source})`);
      }
      
      // Count by source
      const sourceCount: Record<string, number> = {};
      results.forEach(r => {
        sourceCount[r.source] = (sourceCount[r.source] || 0) + 1;
      });
      
      console.log('\n   Source breakdown:');
      Object.entries(sourceCount).forEach(([source, count]) => {
        console.log(`     ${source}: ${count}`);
      });
    } catch (error) {
      console.error(`   ❌ Error:`, error);
    }
  }
  
  console.log('\n\n=== Checking Environment Variables ===\n');
  console.log('APOLLO_API_KEY:', process.env.APOLLO_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('HUNTER_API_KEY:', process.env.HUNTER_API_KEY ? '✅ Present' : '❌ Missing');
  console.log('PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? '✅ Present' : '❌ Missing');
}

// Run the test
testParallelSearch().catch(console.error);