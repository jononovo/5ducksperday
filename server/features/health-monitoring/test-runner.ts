import { TestRunner } from '../../lib/test-runner';

export interface TestRunnerResponse {
  message: string;
  status: string;
  timestamp?: string;
  duration?: number;
  overallStatus?: string;
  summary?: {
    passed: number;
    total: number;
    failed: number;
    warnings: number;
  };
  tests?: any[];
}

export class HealthMonitoringTestRunner {
  static async runAllTests(): Promise<TestRunnerResponse> {
    try {
      const testRunner = new TestRunner();
      const results = await testRunner.runAllTests();
      
      // Log full report for AI/developer visibility
      console.log('=== TEST SUITE REPORT ===');
      console.log(`Timestamp: ${results.timestamp}`);
      console.log(`Duration: ${results.duration}ms`);
      console.log(`Overall Status: ${results.overallStatus}`);
      console.log(`Summary: ${results.summary.passed}/${results.summary.total} passed, ${results.summary.failed} failed, ${results.summary.warnings} warnings`);
      console.log('Individual Tests:');
      results.tests.forEach(test => {
        console.log(`  ${test.name}: ${test.status}`);
        if (test.subTests && Array.isArray(test.subTests)) {
          test.subTests.forEach(subTest => {
            console.log(`    - ${subTest.name}: ${subTest.status} - ${subTest.message}`);
          });
        }
      });
      console.log('=== END TEST REPORT ===');
      
      return results;
    } catch (error) {
      console.error('Test runner error:', error);
      throw error;
    }
  }
}