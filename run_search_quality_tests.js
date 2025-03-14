/**
 * Search Quality Testing Script
 * 
 * This script executes three specific search quality tests to evaluate
 * contact validation improvements.
 * 
 * Usage:
 * 1. Navigate to the Build page in the UI
 * 2. Open the browser console
 * 3. Copy and paste this entire script
 * 4. Execute it to run the baseline tests
 */

// Test configuration
const TEST_CONFIG = {
  strategyId: 17, // Advanced Key Contact Discovery strategy
  baselineTests: [
    {
      query: "tech startups in San Francisco",
      name: "Test 1: Tech Startups"
    },
    {
      query: "marketing agencies in New York",
      name: "Test 2: Marketing Agencies"
    },
    {
      query: "healthcare providers in Chicago",
      name: "Test 3: Healthcare Providers"
    }
  ]
};

// Utility function to save results to a file download
function saveResultsToFile(results, filename) {
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
  console.log(`Results saved to ${filename}`);
}

// Helper to format a timestamp
function formatTime() {
  return new Date().toISOString();
}

// Execute a single search test
async function executeSearchTest(query, strategyId) {
  console.log(`Executing test: "${query}"`);
  
  try {
    // Create a unique test ID
    const testId = `test-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Execute the search
    const response = await fetch('/api/companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query,
        strategyId,
        testId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status} ${response.statusText}`);
    }
    
    const searchResults = await response.json();
    console.log(`Search complete for "${query}". Found ${searchResults.companies?.length || 0} companies.`);
    
    // Score a full test result
    const testResult = await fetch('/api/search-test-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        testId,
        strategyId,
        query
      })
    });
    
    if (!testResult.ok) {
      throw new Error(`Test scoring failed: ${testResult.status} ${testResult.statusText}`);
    }
    
    const testScore = await testResult.json();
    
    console.log(`Test results for "${query}":`, {
      companyQuality: testScore.companyQuality,
      contactQuality: testScore.contactQuality,
      emailQuality: testScore.emailQuality,
      overallScore: testScore.overallScore
    });
    
    return {
      ...testScore,
      timestamp: formatTime(),
      createdAt: formatTime()
    };
  } catch (error) {
    console.error(`Error executing test for "${query}":`, error);
    throw error;
  }
}

// Execute all three test cases
async function runAllTests() {
  console.log("==== STARTING SEARCH QUALITY TESTS ====");
  console.log(`Strategy ID: ${TEST_CONFIG.strategyId}`);
  console.log("Test cases:", TEST_CONFIG.baselineTests.map(t => t.name));
  
  const results = [];
  const allTestsData = {};
  
  for (const test of TEST_CONFIG.baselineTests) {
    try {
      console.log(`\n==== RUNNING ${test.name} ====`);
      const result = await executeSearchTest(test.query, TEST_CONFIG.strategyId);
      results.push({
        name: test.name,
        query: test.query,
        ...result
      });
      
      // Store for final save
      allTestsData[test.name] = {
        currentTest: result,
        recentTests: [] // We don't load historical data here
      };
      
    } catch (error) {
      console.error(`Failed to run test "${test.name}":`, error);
    }
  }
  
  console.log("\n==== TEST RUNS COMPLETED ====");
  console.log("Results summary:");
  results.forEach(r => {
    console.log(`${r.name}: Overall ${r.overallScore}, Contacts ${r.contactQuality}`);
  });
  
  // Calculate average scores
  const contactScores = results.map(r => r.contactQuality);
  const averageContactScore = contactScores.reduce((a, b) => a + b, 0) / contactScores.length;
  
  console.log(`\nAverage contact quality score: ${averageContactScore.toFixed(1)}`);
  
  // Save all results to files
  saveResultsToFile(allTestsData[TEST_CONFIG.baselineTests[0].name], 'improved_test1.json');
  saveResultsToFile(allTestsData[TEST_CONFIG.baselineTests[1].name], 'improved_test2.json');
  saveResultsToFile(allTestsData[TEST_CONFIG.baselineTests[2].name], 'improved_test3.json');
  
  // Return the summary
  return {
    averageContactScore,
    tests: results
  };
}

// Execute all tests when this script is run
runAllTests().then(summary => {
  console.log("Search quality testing complete!");
}).catch(error => {
  console.error("Error in test execution:", error);
});