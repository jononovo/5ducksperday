// Test the Company Overview Module specifically
import { CompanyOverviewModule } from './server/lib/search-modules.js';

async function testCompanyOverview() {
  console.log('Testing Company Overview Module...');
  
  const module = new CompanyOverviewModule();
  
  try {
    const context = {
      query: 'plumbing companies in Boston',
      config: {
        searchOptions: {
          ignoreFranchises: false,
          locallyHeadquartered: false
        },
        subsearches: {
          'industry-analysis': true,
          'company-size': true
        }
      }
    };
    
    const result = await module.execute(context);
    console.log('Company Overview Module successful!');
    console.log('Found companies:', result.companies.length);
    console.log('Metadata:', result.metadata);
    
    if (result.companies.length > 0) {
      console.log('First company example:', result.companies[0]);
    }
    
  } catch (error) {
    console.error('Company Overview Module failed:', error.message);
    console.error('Full error:', error);
  }
}

testCompanyOverview();