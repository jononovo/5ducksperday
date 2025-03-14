/**
 * Search Quality Test Runner
 * 
 * This script runs a series of search quality tests to compare baseline performance
 * with improvements after implementing industry-specific name filtering.
 * 
 * Usage:
 * node run_search_quality_tests.js
 * 
 * Test process:
 * 1. Run baseline tests against a specific set of queries
 * 2. Save results to baseline_testN.json files
 * 3. Run improved tests against the same queries
 * 4. Save results to improved_testN.json files
 * 5. Compare results and output improvement metrics
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Configuration
const API_ENDPOINT = 'http://localhost:5000/api/agent/run-search-test';
const STRATEGY_ID = 17; // ID of the search strategy to test
const TEST_QUERIES = [
  "tech startups in San Francisco",
  "marketing agencies in New York",
  "healthcare providers in Chicago"
];

// Function to save test results to a file
function saveResultsToFile(results, filename) {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(results, null, 2));
  console.log(`Results saved to ${filename}`);
}

// Function to format timestamp for console output
function formatTime() {
  const now = new Date();
  return now.toLocaleTimeString();
}

// Function to execute a single search test
async function executeSearchTest(query, strategyId) {
  console.log(`[${formatTime()}] Running test for query: "${query}"`);
  
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        strategyId,
        query,
        saveToDatabase: true
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(`[${formatTime()}] Test completed. Overall score: ${data.currentTest.overallScore}`);
    return data;
  } catch (error) {
    console.error(`[${formatTime()}] Error executing search test:`, error.message);
    throw error;
  }
}

// Main function to run all tests
async function runAllTests() {
  console.log('=== 5 Ducks Search Quality Testing ===');
  console.log(`Starting tests at ${formatTime()}`);
  
  try {
    // Run baseline tests
    console.log('\n=== Running Baseline Tests ===');
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const query = TEST_QUERIES[i];
      const result = await executeSearchTest(query, STRATEGY_ID);
      saveResultsToFile(result, `baseline_test${i+1}.json`);
    }
    
    // Pause to allow system to update with the new filters
    console.log('\nPausing for 5 seconds to ensure system is updated...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run improved tests
    console.log('\n=== Running Improved Tests ===');
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const query = TEST_QUERIES[i];
      const result = await executeSearchTest(query, STRATEGY_ID);
      saveResultsToFile(result, `improved_test${i+1}.json`);
    }
    
    // Run final tests after all improvements
    console.log('\n=== Running Final Tests ===');
    for (let i = 0; i < TEST_QUERIES.length; i++) {
      const query = TEST_QUERIES[i];
      const result = await executeSearchTest(query, STRATEGY_ID);
      saveResultsToFile(result, `final_test${i+1}.json`);
    }
    
    console.log('\n=== All Tests Completed ===');
    console.log('Baseline tests are in baseline_test*.json');
    console.log('Intermediate tests are in improved_test*.json');
    console.log('Final tests are in final_test*.json');
    console.log('\nTo compare results, use the test_helper.js functions');
    
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Execute the tests
runAllTests();