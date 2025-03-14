/**
 * Testing Helper Functions
 * This file contains utility functions to help with testing search quality
 */

// Function to compute score differences between baseline and improved tests
function compareTestResults(baseline, improved) {
  if (!baseline || !improved) {
    return { error: "Missing test data" };
  }
  
  const baselineTest = baseline.currentTest;
  const improvedTest = improved.currentTest;
  
  if (!baselineTest || !improvedTest) {
    return { error: "Invalid test data format" };
  }
  
  // Calculate differences
  const differences = {
    companyQuality: improvedTest.companyQuality - baselineTest.companyQuality,
    contactQuality: improvedTest.contactQuality - baselineTest.contactQuality,
    emailQuality: improvedTest.emailQuality - baselineTest.emailQuality,
    overallScore: improvedTest.overallScore - baselineTest.overallScore
  };
  
  // Calculate percentage changes
  const percentages = {
    companyQuality: (differences.companyQuality / baselineTest.companyQuality) * 100,
    contactQuality: (differences.contactQuality / baselineTest.contactQuality) * 100,
    emailQuality: (differences.emailQuality / baselineTest.emailQuality) * 100,
    overallScore: (differences.overallScore / baselineTest.overallScore) * 100
  };
  
  return {
    query: baselineTest.query,
    baseline: {
      companyQuality: baselineTest.companyQuality,
      contactQuality: baselineTest.contactQuality,
      emailQuality: baselineTest.emailQuality,
      overallScore: baselineTest.overallScore
    },
    improved: {
      companyQuality: improvedTest.companyQuality,
      contactQuality: improvedTest.contactQuality,
      emailQuality: improvedTest.emailQuality,
      overallScore: improvedTest.overallScore
    },
    differences,
    percentages
  };
}

// Function to format the comparison result as a table
function formatComparisonTable(comparisons) {
  console.table(comparisons.map(c => ({
    'Query': c.query,
    'Baseline Contact': c.baseline.contactQuality,
    'Improved Contact': c.improved.contactQuality,
    'Diff': c.differences.contactQuality,
    'Change %': c.percentages.contactQuality.toFixed(1) + '%'
  })));
  
  // Calculate averages
  const avgBaselineContact = comparisons.reduce((sum, c) => sum + c.baseline.contactQuality, 0) / comparisons.length;
  const avgImprovedContact = comparisons.reduce((sum, c) => sum + c.improved.contactQuality, 0) / comparisons.length;
  const avgDiff = avgImprovedContact - avgBaselineContact;
  const avgPercent = (avgDiff / avgBaselineContact) * 100;
  
  console.log('\nSUMMARY:');
  console.log(`Average Baseline Contact: ${avgBaselineContact.toFixed(1)}`);
  console.log(`Average Improved Contact: ${avgImprovedContact.toFixed(1)}`);
  console.log(`Average Difference: ${avgDiff.toFixed(1)}`);
  console.log(`Average Percent Change: ${avgPercent.toFixed(1)}%`);
  
  return {
    avgBaselineContact,
    avgImprovedContact,
    avgDiff,
    avgPercent
  };
}

// Function to compare two test files
function compareTestFiles(baselineResults, improvedResults) {
  try {
    // Parse if needed
    const baseline = typeof baselineResults === 'string' ? JSON.parse(baselineResults) : baselineResults;
    const improved = typeof improvedResults === 'string' ? JSON.parse(improvedResults) : improvedResults;
    
    return compareTestResults(baseline, improved);
  } catch (error) {
    console.error("Error comparing test files:", error);
    return { error: error.message };
  }
}

// Function to load and compare all test results
async function compareAllTestResults() {
  try {
    // Load baseline tests from files
    const baseline1 = await fetch('/baseline_test1.json').then(r => r.json());
    const baseline2 = await fetch('/baseline_test2.json').then(r => r.json());
    const baseline3 = await fetch('/baseline_test3.json').then(r => r.json());
    
    // Load improved tests from files
    const improved1 = await fetch('/improved_test1.json').then(r => r.json());
    const improved2 = await fetch('/improved_test2.json').then(r => r.json());
    const improved3 = await fetch('/improved_test3.json').then(r => r.json());
    
    // Compare each test
    const comparison1 = compareTestResults(baseline1, improved1);
    const comparison2 = compareTestResults(baseline2, improved2);
    const comparison3 = compareTestResults(baseline3, improved3);
    
    // Format and display results
    const summary = formatComparisonTable([comparison1, comparison2, comparison3]);
    
    return {
      comparisons: [comparison1, comparison2, comparison3],
      summary
    };
  } catch (error) {
    console.error("Error comparing all test results:", error);
    return { error: error.message };
  }
}