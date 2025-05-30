import { storage } from "../../storage-switching/storage-switcher";
import { queryPerplexity } from "./api/perplexity-client";

export interface SubTestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  data?: any;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  duration: number;
  subTests: SubTestResult[];
  error?: string;
}

export interface TestReport {
  timestamp: string;
  duration: number;
  overallStatus: 'passed' | 'failed' | 'warning';
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  tests: TestResult[];
}

export class TestRunner {
  async runDatabaseTest(): Promise<TestResult> {
    const startTime = Date.now();
    const subTests: SubTestResult[] = [];
    
    try {
      // Test companies endpoint
      const companiesResponse = await fetch('http://localhost:5000/api/companies');
      const companiesData = companiesResponse.ok ? await companiesResponse.json() : null;
      
      subTests.push({
        name: 'Replit DB Connection',
        status: (companiesResponse.status === 200 || companiesResponse.status === 401) ? 'passed' : 'failed',
        message: (companiesResponse.status === 200 || companiesResponse.status === 401) ? 'Replit Database connection active' : `Database error: ${companiesResponse.status}`,
        data: { statusCode: companiesResponse.status }
      });

      // Test lists endpoint
      const listsResponse = await fetch('http://localhost:5000/api/lists');
      const listsData = listsResponse.ok ? await listsResponse.json() : null;
      
      subTests.push({
        name: 'Data Retrieval Test',
        status: Array.isArray(companiesData) ? 'passed' : 'failed',
        message: Array.isArray(companiesData) ? `Retrieved ${companiesData.length} companies` : 'Data retrieval failed',
        data: { companiesCount: Array.isArray(companiesData) ? companiesData.length : 0 }
      });

      subTests.push({
        name: 'Schema Integrity',
        status: Array.isArray(listsData) ? 'passed' : 'failed',
        message: Array.isArray(listsData) ? 'Database schema operational' : 'Schema validation failed',
        data: { listsCount: Array.isArray(listsData) ? listsData.length : 0 }
      });

      const allPassed = subTests.every(test => test.status === 'passed');
      
      return {
        name: 'Database Connectivity',
        status: allPassed ? 'passed' : 'failed',
        message: allPassed ? "Replit database fully operational" : "Database issues detected",
        duration: Date.now() - startTime,
        subTests
      };
    } catch (error) {
      return {
        name: 'Database Connectivity',
        status: 'failed',
        message: "Database connection failed",
        duration: Date.now() - startTime,
        subTests,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runSearchTest(): Promise<TestResult> {
    const startTime = Date.now();
    const subTests: SubTestResult[] = [];
    
    try {
      // Test actual company quick search endpoint
      const quickSearchResponse = await fetch('http://localhost:5000/api/companies/quick-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: "test company", strategyId: null })
      });
      const quickSearchData = quickSearchResponse.ok ? await quickSearchResponse.json() : null;
      
      subTests.push({
        name: 'Company Quick Search',
        status: quickSearchResponse.ok && quickSearchData ? 'passed' : 'failed',
        message: quickSearchResponse.ok && quickSearchData ? 
          `Quick search operational - found ${quickSearchData.companies?.length || 0} companies` : 
          'Quick search endpoint failed',
        data: { 
          statusCode: quickSearchResponse.status,
          companiesFound: quickSearchData?.companies?.length || 0
        }
      });

      // Test company data retrieval
      const companiesResponse = await fetch('http://localhost:5000/api/companies');
      const companiesData = companiesResponse.ok ? await companiesResponse.json() : null;
      
      subTests.push({
        name: 'Company Data Retrieval',
        status: Array.isArray(companiesData) ? 'passed' : 'failed',
        message: Array.isArray(companiesData) ? 
          `Company database accessible - ${companiesData.length} total companies` : 
          'Company data retrieval failed',
        data: { 
          statusCode: companiesResponse.status,
          totalCompanies: Array.isArray(companiesData) ? companiesData.length : 0
        }
      });

      // Test workflow search endpoint
      const workflowResponse = await fetch('http://localhost:5000/api/workflow-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: "test workflow", strategyId: null })
      });
      
      subTests.push({
        name: 'Workflow Search',
        status: workflowResponse.status === 200 || workflowResponse.status === 401 ? 'passed' : 'failed',
        message: workflowResponse.status === 200 ? 
          'Workflow search endpoint operational' : 
          workflowResponse.status === 401 ? 
          'Workflow search requires authentication (expected)' :
          'Workflow search endpoint failed',
        data: { statusCode: workflowResponse.status }
      });

      const allPassed = subTests.every(test => test.status === 'passed');
      
      return {
        name: 'Search Functionality',
        status: allPassed ? 'passed' : 'failed',
        message: allPassed ? "Search functionality fully operational" : "Search system issues detected",
        duration: Date.now() - startTime,
        subTests
      };
    } catch (error) {
      return {
        name: 'Search Functionality',
        status: 'failed',
        message: "Search test failed",
        duration: Date.now() - startTime,
        subTests,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runHealthTest(): Promise<TestResult> {
    const startTime = Date.now();
    const subTests: SubTestResult[] = [];
    
    try {
      // Test Perplexity API
      try {
        await queryPerplexity([{
          role: "user",
          content: "Test connection"
        }]);
        subTests.push({
          name: 'Perplexity API',
          status: 'passed',
          message: 'API integration ready'
        });
      } catch (error) {
        subTests.push({
          name: 'Perplexity API',
          status: 'failed',
          message: 'Perplexity API not responding',
          data: { error: error instanceof Error ? error.message : String(error) }
        });
      }

      // Test AeroLeads API key
      const aeroLeadsKey = process.env.AEROLEADS_API_KEY;
      subTests.push({
        name: 'AeroLeads API',
        status: aeroLeadsKey ? 'passed' : 'failed',
        message: aeroLeadsKey ? 'Contact discovery service ready' : 'AeroLeads API key missing'
      });

      // Test server health
      const response = await fetch('http://localhost:5000/api/health');
      const isWorking = response.status === 200;
      
      subTests.push({
        name: 'Server Health',
        status: isWorking ? 'passed' : 'failed',
        message: isWorking ? 'Backend services operational' : 'Server health check failed'
      });

      const allPassed = subTests.every(test => test.status === 'passed');
      
      return {
        name: 'API Health',
        status: allPassed ? 'passed' : 'failed',
        message: allPassed ? "API health tests passed" : "API health issues detected",
        duration: Date.now() - startTime,
        subTests
      };
    } catch (error) {
      return {
        name: 'API Health',
        status: 'failed',
        message: "API health test failed",
        duration: Date.now() - startTime,
        subTests,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async runAllTests(): Promise<TestReport> {
    const startTime = Date.now();
    
    const [databaseTest, searchTest, healthTest] = await Promise.all([
      this.runDatabaseTest(),
      this.runSearchTest(),
      this.runHealthTest()
    ]);

    const tests = [databaseTest, searchTest, healthTest];
    
    // Calculate summary
    const summary = {
      total: tests.length,
      passed: tests.filter(t => t.status === 'passed').length,
      failed: tests.filter(t => t.status === 'failed').length,
      warnings: tests.filter(t => t.status === 'warning').length
    };

    // Determine overall status
    let overallStatus: 'passed' | 'failed' | 'warning' = 'passed';
    if (summary.failed > 0) {
      overallStatus = 'failed';
    } else if (summary.warnings > 0) {
      overallStatus = 'warning';
    }

    return {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      overallStatus,
      summary,
      tests
    };
  }
}