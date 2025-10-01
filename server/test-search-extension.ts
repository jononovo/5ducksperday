/**
 * Test runner specifically for the "+5 More" Search Extension Feature
 * Run this to verify the extension feature is working correctly
 */

import { TestRunner } from './lib/test-runner';
import { HealthMonitoringTestRunner } from './features/health-monitoring/test-runner';

async function runExtensionTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 RUNNING SEARCH EXTENSION TESTS');
  console.log('='.repeat(60) + '\n');
  
  try {
    // Run all backend search tests which includes the extension test
    const testRunner = new TestRunner();
    const backendResults = await testRunner.runBackendSearchTest();
    
    console.log('\n📊 BACKEND SEARCH TESTS RESULTS:');
    console.log('-'.repeat(40));
    console.log(`Status: ${backendResults.status.toUpperCase()}`);
    console.log(`Duration: ${backendResults.duration}ms`);
    console.log(`Message: ${backendResults.message}`);
    
    if (backendResults.subTests) {
      console.log('\nSub-tests:');
      backendResults.subTests.forEach(test => {
        const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
        console.log(`  ${icon} ${test.name}: ${test.status}`);
        console.log(`     ${test.message}`);
        if (test.data) {
          console.log(`     Data:`, test.data);
        }
      });
      
      // Find and highlight the extension test specifically
      const extensionTest = backendResults.subTests.find(t => t.name === 'Search Extension (+5 More)');
      if (extensionTest) {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 "+5 MORE" EXTENSION TEST RESULT:');
        console.log('-'.repeat(40));
        console.log(`Status: ${extensionTest.status.toUpperCase()}`);
        console.log(`Message: ${extensionTest.message}`);
        if (extensionTest.data) {
          console.log('Details:');
          console.log(`  - Job ID: ${extensionTest.data.jobId || 'N/A'}`);
          console.log(`  - Companies Added: ${extensionTest.data.companiesAdded || 0}`);
          console.log(`  - Has Duplicates: ${extensionTest.data.hasDuplicates ? 'YES ❌' : 'NO ✅'}`);
          console.log(`  - Initial Companies: ${extensionTest.data.initialCompaniesCount || 0}`);
        }
        if (extensionTest.error) {
          console.log(`Error: ${extensionTest.error}`);
        }
      }
    }
    
    // Also run the full test suite for comprehensive validation
    console.log('\n' + '='.repeat(60));
    console.log('🧪 RUNNING FULL SYSTEM TEST SUITE');
    console.log('='.repeat(60) + '\n');
    
    const fullResults = await HealthMonitoringTestRunner.runAllTests();
    
    console.log('\n📊 FULL SYSTEM TEST RESULTS:');
    console.log('-'.repeat(40));
    console.log(`Overall Status: ${fullResults.overallStatus?.toUpperCase()}`);
    console.log(`Summary: ${fullResults.summary?.passed}/${fullResults.summary?.total} passed`);
    console.log(`Failed: ${fullResults.summary?.failed}, Warnings: ${fullResults.summary?.warnings}`);
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🏁 TEST EXECUTION COMPLETE');
    console.log('='.repeat(60));
    
    const extensionTest = backendResults.subTests?.find(t => t.name === 'Search Extension (+5 More)');
    if (extensionTest?.status === 'passed') {
      console.log('\n✅ "+5 More" Extension Feature: WORKING CORRECTLY');
    } else if (extensionTest?.status === 'warning') {
      console.log('\n⚠️  "+5 More" Extension Feature: WORKING WITH WARNINGS');
      console.log('   ', extensionTest.message);
    } else {
      console.log('\n❌ "+5 More" Extension Feature: NEEDS ATTENTION');
      if (extensionTest) {
        console.log('   ', extensionTest.message);
      }
    }
    
    return {
      backendResults,
      fullResults,
      extensionTestStatus: extensionTest?.status || 'not_found'
    };
    
  } catch (error) {
    console.error('\n❌ TEST RUNNER ERROR:', error);
    throw error;
  }
}

// Execute tests if run directly
runExtensionTests()
  .then(results => {
    console.log('\n✨ Test execution completed successfully');
    process.exit(results.extensionTestStatus === 'failed' ? 1 : 0);
  })
  .catch(error => {
    console.error('\n💥 Test execution failed:', error);
    process.exit(1);
  });

export { runExtensionTests };