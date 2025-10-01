#!/usr/bin/env tsx
/**
 * Test Apollo API to see why it's returning no emails
 */

import axios from 'axios';

async function testApolloAPI() {
  const apiKey = process.env.APOLLO_API_KEY;
  
  if (!apiKey) {
    console.log('❌ APOLLO_API_KEY not found in environment');
    return;
  }

  console.log('✅ APOLLO_API_KEY exists');
  console.log('\n=== Testing Apollo API ===\n');

  // Test cases with different website formats
  const testCases = [
    {
      name: 'Joseph Lubin',
      organization_name: 'ConsenSys',
      domain: 'consensys.net' // Clean domain
    },
    {
      name: 'Joseph Lubin',
      organization_name: 'ConsenSys',
      domain: 'https://consensys.net' // With https
    },
    {
      name: 'Alex Eu',
      organization_name: 'Teamshares',
      domain: 'teamshares.com' // Clean domain
    },
    {
      name: 'Alex Eu', 
      organization_name: 'Teamshares, Inc',
      domain: 'https://www.f6s.com/companies/teamshares-inc' // Wrong domain
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📧 Testing: ${testCase.name} at ${testCase.organization_name}`);
    console.log(`   Domain: ${testCase.domain}`);
    
    try {
      const response = await axios.post(
        'https://api.apollo.io/v1/people/match',
        testCase,
        {
          headers: {
            'X-Api-Key': apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        }
      );

      console.log('   Response status:', response.status);
      
      if (response.data?.person) {
        console.log('   ✅ Person found!');
        console.log('   - Email:', response.data.person.email || 'No email');
        console.log('   - Title:', response.data.person.title || 'No title');
        console.log('   - Confidence:', response.data.person.email_confidence || 'N/A');
      } else if (response.data?.match) {
        console.log('   ⚠️ Match status:', response.data.match);
        console.log('   Full response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('   ❌ No person found in response');
        console.log('   Full response:', JSON.stringify(response.data, null, 2));
      }
    } catch (error: any) {
      console.log('   ❌ API Error:', error.response?.status || error.message);
      if (error.response?.data) {
        console.log('   Error details:', JSON.stringify(error.response.data, null, 2));
      }
      
      if (error.response?.status === 401) {
        console.log('   🔑 API Key seems invalid or expired');
      } else if (error.response?.status === 429) {
        console.log('   ⏳ Rate limit exceeded');
      }
    }
  }

  console.log('\n\n=== Testing with simplified domain extraction ===\n');
  
  // Test with domain extraction logic
  function extractDomain(website: string | null): string | null {
    if (!website) return null;
    
    // Remove protocol
    let domain = website.replace(/^https?:\/\//i, '');
    // Remove www
    domain = domain.replace(/^www\./i, '');
    // Remove path
    domain = domain.split('/')[0];
    // Remove port
    domain = domain.split(':')[0];
    
    return domain || null;
  }

  const problematicWebsites = [
    'https://www.f6s.com/companies/teamshares-inc',
    'https://consensys.net',
    'https://apy.finance',
    'partydao.io',
    'https://www.propelfinance.com'
  ];

  console.log('Domain extraction test:');
  for (const website of problematicWebsites) {
    console.log(`  ${website} → ${extractDomain(website)}`);
  }
}

// Run the test
testApolloAPI().catch(console.error);