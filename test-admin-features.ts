// Test script to verify admin functionality
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function testAdminFeatures() {
  console.log('Testing Admin Features...\n');

  // Test 1: Check admin stats endpoint without auth (should fail)
  console.log('Test 1: Access admin stats without auth');
  try {
    const response = await axios.get(`${API_URL}/api/admin/stats`);
    console.log('❌ Should have failed - got response:', response.status);
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected unauthorized request');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }

  // Test 2: Check API health endpoint (public)
  console.log('\nTest 2: Check API health (public endpoint)');
  try {
    const response = await axios.get(`${API_URL}/api/test/health`);
    console.log('✅ Health check passed:', response.data);
  } catch (error: any) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 3: Database connectivity
  console.log('\nTest 3: Check database status');
  try {
    const response = await axios.get(`${API_URL}/api/test/db-status`);
    console.log('✅ Database status:', response.data);
  } catch (error: any) {
    console.log('❌ Database check failed:', error.message);
  }

  // Test 4: Check test/api endpoint (runs comprehensive tests)
  console.log('\nTest 4: Run comprehensive API tests');
  try {
    const response = await axios.post(`${API_URL}/api/test/api`);
    console.log('✅ API tests completed:');
    console.log(`  - Status: ${response.data.overallStatus}`);
    console.log(`  - Passed: ${response.data.summary.passed}/${response.data.summary.total}`);
    console.log(`  - Failed: ${response.data.summary.failed}`);
    console.log(`  - Warnings: ${response.data.summary.warnings}`);
    
    if (response.data.tests) {
      console.log('\n  Test Results:');
      response.data.tests.forEach((test: any) => {
        const icon = test.status === 'passed' ? '✅' : 
                     test.status === 'failed' ? '❌' : '⚠️';
        console.log(`    ${icon} ${test.name}: ${test.message}`);
        
        if (test.subTests) {
          test.subTests.forEach((subTest: any) => {
            const subIcon = subTest.status === 'passed' ? '  ✓' : 
                           subTest.status === 'failed' ? '  ✗' : '  ⚠';
            console.log(`      ${subIcon} ${subTest.name}: ${subTest.message}`);
          });
        }
      });
    }
  } catch (error: any) {
    console.log('❌ API tests failed:', error.message);
  }

  console.log('\n=== Admin Feature Tests Complete ===\n');
}

// Run the tests
testAdminFeatures().catch(console.error);