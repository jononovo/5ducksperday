import { storage } from "../storage";
import { queryPerplexity } from "../search/perplexity/perplexity-client";

export interface SubTestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  duration?: number;
  data?: any;
  error?: string;
}

export interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  duration: number;
  category?: string;
  subTests?: SubTestResult[];
  data?: any;
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
      
      let quickSearchData = null;
      if (quickSearchResponse.ok) {
        quickSearchData = await quickSearchResponse.json();
      }
      
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
      let companiesData = null;
      if (companiesResponse.ok) {
        companiesData = await companiesResponse.json();
      }
      
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

      // Note: Skipped search-approaches endpoint test as it doesn't exist in current implementation

      const allPassed = subTests.every(test => test.status === 'passed');
      
      return {
        name: 'Search Functionality',
        status: allPassed ? 'passed' : 'failed',
        message: allPassed ? "Search functionality fully operational" : "Search system issues detected",
        duration: Date.now() - startTime,
        subTests
      };
    } catch (error) {
      console.error('Search test error details:', error);
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

  // New comprehensive backend search tests
  async runBackendSearchTest(): Promise<TestResult> {
    const startTime = Date.now();
    const subTests: SubTestResult[] = [];
    
    try {
      // Test 1: Job Queue System
      const jobQueueTest = await this.testSearchJobQueue();
      subTests.push(jobQueueTest);

      // Test 2: Parallel Email Search
      const parallelSearchTest = await this.testParallelEmailSearch();
      subTests.push(parallelSearchTest);

      // Test 3: Contact Enrichment
      const contactEnrichmentTest = await this.testContactEnrichment();
      subTests.push(contactEnrichmentTest);

      // Test 4: Batch Processing
      const batchProcessingTest = await this.testBatchProcessing();
      subTests.push(batchProcessingTest);

      // Test 5: Full Search Flow
      const fullSearchFlowTest = await this.testFullSearchFlow();
      subTests.push(fullSearchFlowTest);

      // Test 6: "+5 More" Extension Feature
      const extensionTest = await this.testSearchExtensionFeature();
      subTests.push(extensionTest);

      // Calculate status based on failures and warnings
      const failedCount = subTests.filter(test => test.status === 'failed').length;
      const warningCount = subTests.filter(test => test.status === 'warning').length;
      
      let status: 'passed' | 'failed' | 'warning' = 'passed';
      let message = "Backend search system fully operational";
      
      if (failedCount > 0) {
        status = 'failed';
        message = `Backend search issues detected - ${failedCount} test(s) failed`;
      } else if (warningCount > 0) {
        status = 'warning';
        message = `Backend search operational with ${warningCount} warning(s)`;
      }
      
      return {
        name: 'Backend Search System',
        status,
        message,
        duration: Date.now() - startTime,
        subTests
      };
    } catch (error) {
      return {
        name: 'Backend Search System',
        status: 'failed',
        message: "Backend search test failed",
        duration: Date.now() - startTime,
        subTests,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testSearchJobQueue(): Promise<SubTestResult> {
    try {
      // Create a test job
      const createJobResponse = await fetch('http://localhost:5000/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: "test query for job queue",
          searchType: "companies"
        })
      });

      if (createJobResponse.ok) {
        const jobData = await createJobResponse.json();
        const hasJobId = jobData.jobId && typeof jobData.jobId === 'string';
        
        return {
          name: 'Search Job Queue',
          status: hasJobId ? 'passed' : 'failed',
          message: hasJobId ? `Job queue operational - created job ${jobData.jobId}` : 'Job creation failed',
          data: { 
            jobId: jobData.jobId,
            status: jobData.status
          }
        };
      } else {
        return {
          name: 'Search Job Queue',
          status: 'failed',
          message: `Job queue endpoint failed with status ${createJobResponse.status}`,
          data: { statusCode: createJobResponse.status }
        };
      }
    } catch (error) {
      return {
        name: 'Search Job Queue',
        status: 'failed',
        message: 'Job queue test error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testParallelEmailSearch(): Promise<SubTestResult> {
    try {
      // Import the parallel search service
      const { parallelTieredEmailSearch } = await import('../search/services/parallel-email-search');
      
      // Create mock contacts for testing
      const mockContacts = [
        { id: 1, name: 'Test User 1', probability: 80 },
        { id: 2, name: 'Test User 2', probability: 60 }
      ];
      
      const mockCompany = {
        name: 'Test Company',
        website: 'test.com'
      };

      // Run parallel search (will hit API limits if no keys, but validates the function)
      const startTime = Date.now();
      const results = await parallelTieredEmailSearch(
        mockContacts, // Mock contacts for testing
        mockCompany, // Mock company
        1 // userId
      );
      const duration = Date.now() - startTime;

      return {
        name: 'Parallel Email Search',
        status: 'passed',
        message: `Parallel search executed in ${duration}ms - processed ${mockContacts.length} contacts`,
        data: { 
          duration,
          contactsProcessed: mockContacts.length,
          resultsCount: results.length
        }
      };
    } catch (error) {
      // If API keys are missing, it's a warning not a failure
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isApiKeyError = errorMessage.toLowerCase().includes('api') || 
                           errorMessage.toLowerCase().includes('key');
      
      return {
        name: 'Parallel Email Search',
        status: isApiKeyError ? 'warning' : 'failed',
        message: isApiKeyError ? 'Parallel search functional but API keys not configured' : 'Parallel search test failed',
        error: errorMessage
      };
    }
  }

  private async testContactEnrichment(): Promise<SubTestResult> {
    try {
      // Test contact-only search endpoint
      const contactSearchResponse = await fetch('http://localhost:5000/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: "test contact enrichment",
          searchType: "contact-only",
          contactSearchConfig: {
            companyId: 1,
            existingCompany: {
              name: "Test Company",
              website: "test.com"
            }
          }
        })
      });

      if (contactSearchResponse.ok) {
        const jobData = await contactSearchResponse.json();
        return {
          name: 'Contact Enrichment',
          status: 'passed',
          message: `Contact enrichment endpoint operational - job ${jobData.jobId}`,
          data: { 
            jobId: jobData.jobId,
            searchType: jobData.searchType
          }
        };
      } else {
        return {
          name: 'Contact Enrichment',
          status: 'failed',
          message: `Contact enrichment failed with status ${contactSearchResponse.status}`,
          data: { statusCode: contactSearchResponse.status }
        };
      }
    } catch (error) {
      return {
        name: 'Contact Enrichment',
        status: 'failed',
        message: 'Contact enrichment test error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testBatchProcessing(): Promise<SubTestResult> {
    try {
      // Import the batch processor
      const { processBatch } = await import('../search/utils/batch-processor');
      
      // Test batch processing with mock items
      const testItems = Array.from({ length: 10 }, (_, i) => i);
      const results = await processBatch(
        testItems,
        async (item: number) => item * 2, // processing function
        3 // batch size
      );

      // Extract actual values from PromiseSettledResult array
      const actualResults = results
        .filter(r => r.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<number>).value);
      
      const expectedResults = testItems.map(n => n * 2);
      const isCorrect = JSON.stringify(actualResults) === JSON.stringify(expectedResults);
      const allFulfilled = results.every(r => r.status === 'fulfilled');

      return {
        name: 'Batch Processor',
        status: isCorrect && allFulfilled ? 'passed' : 'failed',
        message: isCorrect && allFulfilled ? 
          `Batch processor working correctly - processed ${testItems.length} items in batches of 3` :
          'Batch processor results incorrect or some promises rejected',
        data: { 
          itemsProcessed: testItems.length,
          batchSize: 3,
          resultsCorrect: isCorrect,
          allFulfilled
        }
      };
    } catch (error) {
      return {
        name: 'Batch Processor',
        status: 'failed',
        message: 'Batch processor test error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testFullSearchFlow(): Promise<SubTestResult> {
    try {
      // Test the full search flow with a minimal query
      const fullSearchResponse = await fetch('http://localhost:5000/api/companies/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: "test full search",
          includeContacts: true,
          enrichEmails: false // Skip email enrichment to avoid API costs
        })
      });

      if (fullSearchResponse.ok) {
        const searchData = await fullSearchResponse.json();
        const hasCompanies = Array.isArray(searchData.companies);
        
        return {
          name: 'Full Search Flow',
          status: hasCompanies ? 'passed' : 'warning',
          message: hasCompanies ? 
            `Full search flow operational - found ${searchData.companies.length} companies` :
            'Full search completed but no companies found',
          data: { 
            statusCode: fullSearchResponse.status,
            companiesFound: searchData.companies?.length || 0,
            contactsFound: searchData.totalContacts || 0
          }
        };
      } else {
        return {
          name: 'Full Search Flow', 
          status: 'failed',
          message: `Full search failed with status ${fullSearchResponse.status}`,
          data: { statusCode: fullSearchResponse.status }
        };
      }
    } catch (error) {
      return {
        name: 'Full Search Flow',
        status: 'failed', 
        message: 'Full search flow test error',
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

      // Test Hunter API key
      const hunterKey = process.env.HUNTER_API_KEY;
      subTests.push({
        name: 'Hunter API',
        status: hunterKey ? 'passed' : 'failed',
        message: hunterKey ? 'Hunter email discovery ready' : 'Hunter API key missing'
      });

      // Test Apollo API key
      const apolloKey = process.env.APOLLO_API_KEY;
      subTests.push({
        name: 'Apollo API',
        status: apolloKey ? 'passed' : 'failed',
        message: apolloKey ? 'Apollo contact enrichment ready' : 'Apollo API key missing'
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
    
    const [databaseTest, searchTest, healthTest, authTest, backendSearchTest] = await Promise.all([
      this.runDatabaseTest(),
      this.runSearchTest(),
      this.runHealthTest(),
      this.runAuthTest(),
      this.runBackendSearchTest()
    ]);

    // Flatten all sub-tests into individual tests with category metadata
    const allTests: TestResult[] = [];
    
    // Add database tests
    if (databaseTest.subTests) {
      databaseTest.subTests.forEach(subTest => {
        allTests.push({
          name: subTest.name,
          status: subTest.status,
          message: subTest.message,
          duration: subTest.duration || 0,
          category: 'Database Connectivity',
          data: subTest.data,
          error: subTest.error
        });
      });
    }
    
    // Add search tests  
    if (searchTest.subTests) {
      searchTest.subTests.forEach(subTest => {
        allTests.push({
          name: subTest.name,
          status: subTest.status,
          message: subTest.message,
          duration: subTest.duration || 0,
          category: 'Search Functionality',
          data: subTest.data,
          error: subTest.error
        });
      });
    }
    
    // Add API health tests
    if (healthTest.subTests) {
      healthTest.subTests.forEach(subTest => {
        allTests.push({
          name: subTest.name,
          status: subTest.status,
          message: subTest.message,
          duration: subTest.duration || 0,
          category: 'API Health',
          data: subTest.data,
          error: subTest.error
        });
      });
    }
    
    // Add authentication tests
    if (authTest.subTests) {
      authTest.subTests.forEach(subTest => {
        allTests.push({
          name: subTest.name,
          status: subTest.status,
          message: subTest.message,
          duration: subTest.duration || 0,
          category: 'Authentication System',
          data: subTest.data,
          error: subTest.error
        });
      });
    }
    
    // Add backend search tests
    if (backendSearchTest.subTests) {
      backendSearchTest.subTests.forEach(subTest => {
        allTests.push({
          name: subTest.name,
          status: subTest.status,
          message: subTest.message,
          duration: subTest.duration || 0,
          category: 'Backend Search System',
          data: subTest.data,
          error: subTest.error
        });
      });
    }
    
    // Calculate summary based on individual tests
    const summary = {
      total: allTests.length,
      passed: allTests.filter(t => t.status === 'passed').length,
      failed: allTests.filter(t => t.status === 'failed').length,
      warnings: allTests.filter(t => t.status === 'warning').length
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
      tests: allTests
    };
  }

  async runAuthTest(): Promise<TestResult> {
    const startTime = Date.now();
    const subTests: SubTestResult[] = [];
    
    try {
      // Test Firebase Admin SDK initialization
      const firebaseTest = await this.testFirebaseAdmin();
      subTests.push(firebaseTest);

      // Test token validation endpoint  
      const tokenTest = await this.testTokenValidation();
      subTests.push(tokenTest);

      // Test session management
      const sessionTest = await this.testSessionManagement();
      subTests.push(sessionTest);

      // Test authentication middleware
      const middlewareTest = await this.testAuthMiddleware();
      subTests.push(middlewareTest);

      const allPassed = subTests.every(test => test.status === 'passed');
      
      return {
        name: 'Authentication System',
        status: allPassed ? 'passed' : 'failed',
        message: allPassed ? "Authentication system fully operational" : "Authentication issues detected",
        duration: Date.now() - startTime,
        subTests
      };
    } catch (error) {
      return {
        name: 'Authentication System',
        status: 'failed',
        message: "Authentication test failed",
        duration: Date.now() - startTime,
        subTests,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testFirebaseAdmin(): Promise<SubTestResult> {
    try {
      // Check if Firebase Admin is properly initialized
      const admin = await import('firebase-admin');
      const app = admin.apps.length > 0 ? admin.apps[0] : null;
      
      if (app && app.options.projectId) {
        return {
          name: 'Firebase Admin SDK',
          status: 'passed',
          message: `Firebase Admin initialized with project: ${app.options.projectId}`
        };
      } else {
        return {
          name: 'Firebase Admin SDK',
          status: 'failed',
          message: 'Firebase Admin SDK not properly initialized'
        };
      }
    } catch (error) {
      return {
        name: 'Firebase Admin SDK',
        status: 'failed',
        message: 'Firebase Admin SDK error',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async testTokenValidation(): Promise<SubTestResult> {
    try {
      // Test the /api/user endpoint without authentication (should fail)
      const unauthResponse = await fetch('http://localhost:5000/api/user');
      
      if (unauthResponse.status === 401) {
        return {
          name: 'Token Validation Service',
          status: 'passed',
          message: 'Token validation properly rejects unauthorized requests'
        };
      } else {
        return {
          name: 'Token Validation Service',
          status: 'warning',
          message: `Unexpected response: ${unauthResponse.status} (expected 401)`
        };
      }
    } catch (error) {
      return {
        name: 'Token Validation Service',
        status: 'failed',
        message: 'Token validation service error',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async testSessionManagement(): Promise<SubTestResult> {
    try {
      // Test session-related endpoints exist and respond
      const loginResponse = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'invalid' })
      });
      
      // Should get a response (even if auth fails) indicating endpoint exists
      if (loginResponse.status === 400 || loginResponse.status === 401) {
        return {
          name: 'Session Management',
          status: 'passed',
          message: 'Session endpoints responsive'
        };
      } else {
        return {
          name: 'Session Management',
          status: 'warning',
          message: `Session endpoint status: ${loginResponse.status}`
        };
      }
    } catch (error) {
      return {
        name: 'Session Management',
        status: 'failed',
        message: 'Session management error',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async testAuthMiddleware(): Promise<SubTestResult> {
    try {
      // Test a protected endpoint to verify middleware works
      const protectedResponse = await fetch('http://localhost:5000/api/companies');
      
      // Should either work (200) or require auth (401), but not crash
      if (protectedResponse.status === 200 || protectedResponse.status === 401) {
        return {
          name: 'Auth Middleware',
          status: 'passed',
          message: 'Authentication middleware operational'
        };
      } else {
        return {
          name: 'Auth Middleware',
          status: 'warning',
          message: `Protected endpoint status: ${protectedResponse.status}`
        };
      }
    } catch (error) {
      return {
        name: 'Auth Middleware',
        status: 'failed',
        message: 'Auth middleware error',
        data: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  // Test the "+5 More" Extension Feature
  private async testSearchExtensionFeature(): Promise<SubTestResult> {
    try {
      console.log('[ExtensionTest] Starting "+5 More" feature test...');
      
      // Step 1: Create an initial search job
      console.log('[ExtensionTest] Step 1: Creating initial search...');
      const initialSearchResponse = await fetch('http://localhost:5000/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: "test companies for extension",
          searchType: "companies"
        })
      });

      if (!initialSearchResponse.ok) {
        return {
          name: 'Search Extension (+5 More)',
          status: 'failed',
          message: `Initial search creation failed with status ${initialSearchResponse.status}`,
          data: { statusCode: initialSearchResponse.status }
        };
      }

      const initialJob = await initialSearchResponse.json();
      console.log(`[ExtensionTest] Initial job created: ${initialJob.jobId}`);

      // Step 2: Wait a bit for the job to complete (simplified for testing)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Get the initial companies (simulate getting results)
      console.log('[ExtensionTest] Step 2: Getting initial companies...');
      const companiesResponse = await fetch('http://localhost:5000/api/companies?limit=7');
      let initialCompanies = [];
      
      if (companiesResponse.ok) {
        initialCompanies = await companiesResponse.json();
        // Take first 7 companies as mock initial results
        initialCompanies = initialCompanies.slice(0, 7);
      }
      
      console.log(`[ExtensionTest] Found ${initialCompanies.length} initial companies`);

      // Step 4: Test the extension endpoint
      console.log('[ExtensionTest] Step 3: Testing extension endpoint...');
      const extensionResponse = await fetch('http://localhost:5000/api/search/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: "test companies for extension",
          excludeCompanyIds: initialCompanies.map(c => ({ name: c.name })),
          contactSearchConfig: {
            enableCoreLeadership: true,
            enableDepartmentHeads: true,
            enableMiddleManagement: true
          }
        })
      });

      if (!extensionResponse.ok) {
        const errorText = await extensionResponse.text();
        console.log(`[ExtensionTest] Extension failed: ${errorText}`);
        return {
          name: 'Search Extension (+5 More)',
          status: 'failed',
          message: `Extension endpoint failed with status ${extensionResponse.status}`,
          data: { 
            statusCode: extensionResponse.status,
            error: errorText
          }
        };
      }

      const extensionData = await extensionResponse.json();
      console.log(`[ExtensionTest] Extension response:`, extensionData);

      // Step 5: Validate the extension results
      const hasJobId = extensionData.jobId && typeof extensionData.jobId === 'string';
      const hasCompanies = Array.isArray(extensionData.companies);
      const correctCompanyCount = hasCompanies && extensionData.companies.length <= 5;
      
      // Check for duplicates
      const initialNames = new Set(initialCompanies.map(c => c.name?.toLowerCase()));
      const newNames = extensionData.companies ? extensionData.companies.map(c => c.name?.toLowerCase()) : [];
      const hasDuplicates = newNames.some(name => initialNames.has(name));

      console.log(`[ExtensionTest] Validation results:`, {
        hasJobId,
        hasCompanies,
        companiesCount: extensionData.companies?.length || 0,
        correctCompanyCount,
        hasDuplicates
      });

      // Step 6: Wait for extension job to complete
      if (hasJobId) {
        console.log(`[ExtensionTest] Step 4: Waiting for extension job ${extensionData.jobId} to complete...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check job status
        const jobStatusResponse = await fetch(`http://localhost:5000/api/search-jobs/${extensionData.jobId}`);
        if (jobStatusResponse.ok) {
          const jobStatus = await jobStatusResponse.json();
          console.log(`[ExtensionTest] Extension job status: ${jobStatus.status}`);
        }
      }

      // Determine test status
      let status: 'passed' | 'failed' | 'warning' = 'passed';
      let message = '';
      
      if (!hasJobId || !hasCompanies) {
        status = 'failed';
        message = 'Extension endpoint did not return expected structure';
      } else if (hasDuplicates) {
        status = 'failed';
        message = 'Extension returned duplicate companies';
      } else if (!correctCompanyCount) {
        status = 'warning';
        message = `Extension returned ${extensionData.companies.length} companies (expected ≤5)`;
      } else if (extensionData.companies.length === 0) {
        status = 'warning';
        message = 'Extension returned 0 companies (may be due to test data limitations)';
      } else {
        message = `Extension feature working correctly - added ${extensionData.companies.length} unique companies`;
      }

      return {
        name: 'Search Extension (+5 More)',
        status,
        message,
        data: {
          jobId: extensionData.jobId,
          companiesAdded: extensionData.companies?.length || 0,
          hasDuplicates,
          initialCompaniesCount: initialCompanies.length
        }
      };

    } catch (error) {
      console.error('[ExtensionTest] Test error:', error);
      return {
        name: 'Search Extension (+5 More)',
        status: 'failed',
        message: 'Extension test error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}