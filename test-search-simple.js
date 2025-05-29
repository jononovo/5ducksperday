// Simple test to check if the search functionality works
import { searchCompanies } from './server/lib/search-logic.js';

async function testSearch() {
  console.log('Testing search functionality...');
  
  try {
    const result = await searchCompanies('plumbing companies in Boston');
    console.log('Search successful!');
    console.log('Found companies:', result);
    console.log('Number of companies:', result?.length || 0);
  } catch (error) {
    console.error('Search failed:', error.message);
    console.error('Full error:', error);
  }
}

testSearch();