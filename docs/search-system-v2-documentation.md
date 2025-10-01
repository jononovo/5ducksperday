# 5Ducks Search System V2 - Technical Documentation

## Executive Summary

The 5Ducks Search System V2 is an enterprise-grade B2B lead generation engine that transforms simple text queries into actionable business intelligence. Built on a resilient, queue-based architecture with progressive data enrichment, the system delivers immediate results while continuously enhancing data quality in the background.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Core Components](#2-core-components)
3. [Search Pipeline](#3-search-pipeline)
4. [Job Queue System](#4-job-queue-system)
5. [Extension System](#5-extension-system)
6. [Contact Discovery Engine](#6-contact-discovery-engine)
7. [Email Enrichment Pipeline](#7-email-enrichment-pipeline)
8. [API Integrations](#8-api-integrations)
9. [Database Design](#9-database-design)
10. [Performance & Optimization](#10-performance--optimization)
11. [Testing & Quality Assurance](#11-testing--quality-assurance)
12. [Error Handling & Resilience](#12-error-handling--resilience)

---

## 1. System Architecture

### 1.1 Design Principles

The system is built on four foundational principles:

- **Progressive Enhancement**: Results appear immediately and improve over time
- **Resilience**: Database-backed job queue survives crashes and retries failures
- **Modularity**: Each component is self-contained with clear interfaces
- **Scalability**: Concurrent processing with intelligent resource management

### 1.2 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          User Interface                          │
│                    (React + TypeScript + TanStack)               │
└────────────────────┬────────────────────────┬────────────────────┘
                     │                        │
                     ▼                        ▼
        ┌────────────────────┐      ┌────────────────────┐
        │   REST API Layer   │      │  WebSocket Layer   │
        │  (Express.js)      │      │ (Real-time Updates)│
        └────────────────────┘      └────────────────────┘
                     │                        │
                     ▼                        ▼
        ┌──────────────────────────────────────────────────┐
        │              Search Orchestrator                  │
        │         (Coordinates all search operations)       │
        └──────────────────────────────────────────────────┘
                     │                        │
        ┌────────────┴────────────┬───────────┴────────────┐
        ▼                         ▼                        ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ Job Queue    │       │ Search       │       │ Extension    │
│ System       │◄──────│ Services     │       │ Module       │
│ (PostgreSQL) │       │              │       │ (+5 More)    │
└──────────────┘       └──────────────┘       └──────────────┘
        │                         │                        │
        └─────────────┬───────────┴────────────────────────┘
                      ▼
        ┌──────────────────────────────────────────────────┐
        │            External API Providers                 │
        │  (Perplexity, Hunter, Apollo, AeroLeads)         │
        └──────────────────────────────────────────────────┘
```

### 1.3 Directory Structure

```
server/search/
├── index.ts                    # Public API exports
├── orchestrator/               # Main coordination layer
│   ├── search-orchestrator.ts
│   └── result-aggregator.ts
├── services/                   # Core services
│   ├── search-job-service.ts  # Job management
│   ├── job-processor.ts       # Background processing
│   ├── contact-search-service.ts
│   └── parallel-email-search.ts
├── extensions/                 # Extension features
│   ├── extension-service.ts   # +5 More logic
│   ├── extension-routes.ts    # API endpoints
│   └── extension-types.ts     # Type definitions
├── perplexity/                # Perplexity integration
│   ├── company-search.ts
│   └── perplexity-client.ts
├── providers/                  # Email providers
│   ├── hunter.ts
│   ├── apollo.ts
│   └── aeroleads.ts
├── contacts/                   # Contact discovery
│   └── finder.ts
├── analysis/                   # Validation & scoring
│   ├── validator.ts
│   └── scorer.ts
├── utils/                      # Utilities
│   └── batch-processor.ts
└── types.ts                    # Type definitions
```

---

## 2. Core Components

### 2.1 Search Orchestrator

The orchestrator is the brain of the search system, coordinating all operations:

```typescript
class SearchOrchestrator {
  // Manages the entire search flow
  async executeSearch(query: string, userId: number): Promise<SearchResults> {
    // 1. Company Discovery (2-3 seconds)
    const companies = await this.discoverCompanies(query);
    
    // 2. Contact Discovery (concurrent, 7 companies at once)
    const contacts = await this.findContacts(companies);
    
    // 3. Email Enrichment (tiered approach)
    const enrichedContacts = await this.enrichEmails(contacts);
    
    // 4. Result Aggregation
    return this.aggregateResults(companies, enrichedContacts);
  }
}
```

### 2.2 Job Queue System

Database-persistent queue for resilient asynchronous processing:

```typescript
interface SearchJob {
  jobId: string;           // UUID
  userId: number;
  query: string;
  searchType: 'companies' | 'contacts' | 'emails' | 'extension';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: JobProgress;
  results: any;
  error?: string;
  retryCount: number;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}
```

### 2.3 Search Services

Modular services for different search aspects:

- **CompanySearchService**: Discovers and enriches company data
- **ContactSearchService**: Finds key decision makers
- **EmailSearchService**: Multi-provider email discovery
- **ExtensionService**: Handles "+5 More" functionality

---

## 3. Search Pipeline

### 3.1 Search Flow Stages

```
User Query → Job Creation → Company Discovery → Contact Discovery → Email Enrichment → Result Delivery
    │            │               (2-3s)            (5-10s)           (10-20s)            │
    │            │                 │                  │                 │                 │
    └────────────┴─────────────────┴──────────────────┴─────────────────┴─────────────────┘
                              Progressive Updates via WebSocket
```

### 3.2 Company Discovery

**Fast Discovery (2-3 seconds)**:
```typescript
async discoverCompanies(query: string): Promise<Company[]> {
  // Perplexity API call for rapid discovery
  const companies = await perplexityClient.search({
    query,
    limit: 7,
    fields: ['name', 'website']
  });
  
  // Immediate display to user
  return companies;
}
```

**Enrichment (Background)**:
```typescript
async enrichCompanyDetails(companies: Company[]): Promise<EnrichedCompany[]> {
  // Parallel enrichment for descriptions, industry, size
  return Promise.all(companies.map(enrichSingleCompany));
}
```

### 3.3 Contact Discovery Strategy

Multi-stage fallback approach:

1. **Core Leadership** (CEO, CTO, CFO, President)
2. **Department Heads** (VP, Director, Head of)
3. **Middle Management** (Manager, Lead, Supervisor)
4. **Custom Search** (User-specified roles)

```typescript
const contactSearchStages = [
  { name: 'Core Leadership', confidence: 0.9 },
  { name: 'Department Heads', confidence: 0.8 },
  { name: 'Middle Management', confidence: 0.7 },
  { name: 'Custom Roles', confidence: 0.6 }
];
```

### 3.4 Progressive Loading Implementation

```typescript
class ProgressiveLoader {
  private updateQueue: UpdateQueue;
  
  async streamResults(jobId: string) {
    // Stage 1: Companies (immediate)
    this.sendUpdate({ phase: 'companies', data: companies });
    
    // Stage 2: Contacts (progressive)
    for (const batch of contactBatches) {
      this.sendUpdate({ phase: 'contacts', data: batch });
    }
    
    // Stage 3: Emails (progressive)
    for (const emailBatch of emailBatches) {
      this.sendUpdate({ phase: 'emails', data: emailBatch });
    }
  }
}
```

---

## 4. Job Queue System

### 4.1 Job Lifecycle

```
                  ┌─────────┐
                  │ Created │
                  └────┬────┘
                       ▼
                  ┌─────────┐     ┌──────────┐
                  │ Pending │────▶│ Expired  │ (timeout)
                  └────┬────┘     └──────────┘
                       ▼
                ┌────────────┐    ┌──────────┐
                │ Processing │───▶│ Failed   │ (error)
                └─────┬──────┘    └─────┬────┘
                      ▼                  │
                ┌────────────┐           │
                │ Completed  │◄──────────┘ (retry)
                └────────────┘
```

### 4.2 Background Processor

```typescript
class JobProcessor {
  private intervalId: NodeJS.Timeout;
  private processingInterval = 5000; // 5 seconds
  
  async processNextJob() {
    // 1. Check for stuck jobs
    await this.recoverStuckJobs();
    
    // 2. Get highest priority pending job
    const job = await this.getNextJob();
    
    // 3. Execute with timeout protection
    await this.executeWithTimeout(job, 120000); // 2 minutes
    
    // 4. Update job status
    await this.updateJobStatus(job);
  }
}
```

### 4.3 Priority System

Jobs are prioritized based on:
- User tier (premium > free)
- Search type (extension > new search)
- Age (older jobs get priority boost)
- Retry count (failed jobs get lower priority)

---

## 5. Extension System

### 5.1 "+5 More" Feature Architecture

The extension system allows users to expand existing searches with additional results:

```typescript
interface ExtensionRequest {
  originalQuery: string;
  excludeCompanyNames: string[];  // Companies to exclude
  listId: number;                  // List to update
  contactSearchConfig: ContactSearchConfig;
}
```

### 5.2 Extension Service Implementation

```typescript
class ExtensionSearchService {
  async extendSearch(params: ExtensionRequest): Promise<ExtensionResult> {
    // 1. Create extension job
    const jobId = await this.createExtensionJob(params);
    
    // 2. Discover 5 new companies (excluding existing)
    const newCompanies = await this.discoverNewCompanies(
      params.originalQuery,
      params.excludeCompanyNames,
      5  // Always exactly 5
    );
    
    // 3. Process contacts and emails
    const enrichedCompanies = await this.enrichNewCompanies(newCompanies);
    
    // 4. Update existing list
    await this.updateList(params.listId, enrichedCompanies);
    
    return { jobId, companies: enrichedCompanies };
  }
}
```

### 5.3 Duplicate Prevention

```typescript
function preventDuplicates(
  newCompanies: Company[],
  existingCompanies: Company[]
): Company[] {
  const existingNames = new Set(
    existingCompanies.map(c => c.name.toLowerCase())
  );
  
  return newCompanies.filter(company => 
    !existingNames.has(company.name.toLowerCase())
  );
}
```

---

## 6. Contact Discovery Engine

### 6.1 Multi-Stage Discovery Process

```typescript
interface ContactDiscoveryOptions {
  enableCoreLeadership: boolean;
  enableDepartmentHeads: boolean;
  enableMiddleManagement: boolean;
  enableCustomSearch: boolean;
  customSearchTarget?: string;
  minContacts: number;  // Default: 3
  maxContacts: number;  // Default: 10
}
```

### 6.2 Contact Validation

```typescript
class ContactValidator {
  validateContact(contact: Contact): ValidationResult {
    const checks = {
      nameValidity: this.validateName(contact.name),
      roleRelevance: this.scoreRole(contact.role),
      duplicateCheck: this.checkDuplicate(contact),
      placeholderCheck: this.isPlaceholder(contact.name)
    };
    
    const score = this.calculateConfidenceScore(checks);
    return { isValid: score > 0.6, score, checks };
  }
}
```

### 6.3 Intelligent Fallback

```typescript
async function findContactsWithFallback(
  company: Company,
  options: ContactDiscoveryOptions
): Promise<Contact[]> {
  let contacts: Contact[] = [];
  
  // Try each stage until we have enough contacts
  for (const stage of contactSearchStages) {
    if (!options[stage.enableFlag]) continue;
    
    const stageContacts = await searchContactsByStage(company, stage);
    contacts = [...contacts, ...stageContacts];
    
    if (contacts.length >= options.minContacts) {
      break; // Sufficient contacts found
    }
  }
  
  // Apply final filtering and scoring
  return contacts
    .filter(c => c.validationScore > 0.6)
    .slice(0, options.maxContacts);
}
```

---

## 7. Email Enrichment Pipeline

### 7.1 Tiered Email Discovery

```
Tier 1: Apollo (all contacts)
  ↓ (if < 50% success)
Tier 2: Perplexity + Hunter (remaining contacts)
  ↓ (if still missing)
Tier 3: AeroLeads (final attempt)
```

### 7.2 Parallel Processing

```typescript
class ParallelEmailSearch {
  async searchEmails(
    contacts: Contact[],
    company: Company
  ): Promise<EmailResult[]> {
    // Tier 1: Apollo for all contacts
    const apolloResults = await Promise.allSettled(
      contacts.map(c => this.searchApollo(c, company))
    );
    
    // Identify contacts still needing emails
    const needsEmail = contacts.filter((_, i) => 
      !apolloResults[i].value?.email
    );
    
    // Tier 2: Parallel Perplexity + Hunter
    if (needsEmail.length > 0) {
      const tier2Results = await Promise.allSettled([
        ...needsEmail.map(c => this.searchPerplexity(c)),
        ...needsEmail.map(c => this.searchHunter(c, company))
      ]);
      
      // Merge results...
    }
    
    return this.consolidateResults(allResults);
  }
}
```

### 7.3 Email Validation

```typescript
interface EmailValidation {
  syntaxValid: boolean;      // RFC 5322 compliance
  domainValid: boolean;      // MX record exists
  patternScore: number;      // Matches common patterns
  providerConfidence: number; // Provider's confidence score
}

function validateEmail(email: string, company: Company): EmailValidation {
  return {
    syntaxValid: isValidEmailSyntax(email),
    domainValid: matchesCompanyDomain(email, company),
    patternScore: scoreEmailPattern(email),
    providerConfidence: getProviderConfidence(email)
  };
}
```

---

## 8. API Integrations

### 8.1 Provider Configuration

```typescript
const API_PROVIDERS = {
  perplexity: {
    baseUrl: 'https://api.perplexity.ai',
    rateLimit: { requests: 50, window: 60000 },
    timeout: 30000,
    retries: 3
  },
  hunter: {
    baseUrl: 'https://api.hunter.io/v2',
    rateLimit: { requests: 100, window: 60000 },
    timeout: 20000,
    retries: 2
  },
  apollo: {
    baseUrl: 'https://api.apollo.io/v1',
    rateLimit: { requests: 100, window: 60000 },
    timeout: 20000,
    retries: 2
  },
  aeroLeads: {
    baseUrl: 'https://api.aeroleads.com/v2',
    rateLimit: { requests: 50, window: 60000 },
    timeout: 20000,
    retries: 2
  }
};
```

### 8.2 Rate Limiting Implementation

```typescript
class RateLimiter {
  private queues: Map<string, RequestQueue> = new Map();
  
  async executeWithRateLimit(
    provider: string,
    request: () => Promise<any>
  ): Promise<any> {
    const queue = this.getQueue(provider);
    const token = await queue.acquireToken();
    
    try {
      return await request();
    } finally {
      queue.releaseToken(token);
    }
  }
}
```

### 8.3 Error Handling & Fallback

```typescript
async function apiCallWithFallback(
  primary: APIProvider,
  fallback: APIProvider,
  request: APIRequest
): Promise<APIResponse> {
  try {
    return await primary.execute(request);
  } catch (primaryError) {
    console.log(`Primary provider failed: ${primaryError.message}`);
    
    if (fallback) {
      try {
        return await fallback.execute(request);
      } catch (fallbackError) {
        throw new AggregateError(
          [primaryError, fallbackError],
          'All providers failed'
        );
      }
    }
    
    throw primaryError;
  }
}
```

---

## 9. Database Design

### 9.1 Core Tables

```sql
-- Search Jobs Table
CREATE TABLE search_jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  query TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  progress JSONB,
  results JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  INDEX idx_status_priority (status, priority DESC),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
);

-- Companies Table
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  description TEXT,
  industry VARCHAR(100),
  size VARCHAR(50),
  location VARCHAR(255),
  list_id INTEGER REFERENCES lists(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_list_id (list_id),
  INDEX idx_user_id (user_id),
  UNIQUE KEY unique_company_list (name, list_id)
);

-- Contacts Table
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  linkedin VARCHAR(255),
  confidence_score DECIMAL(3,2),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_company_id (company_id),
  INDEX idx_email (email),
  UNIQUE KEY unique_contact (company_id, name, email)
);

-- Lists Table
CREATE TABLE lists (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES users(id),
  prompt TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  custom_search_targets TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_user_list (user_id, list_id),
  UNIQUE KEY unique_user_list (user_id, list_id)
);
```

### 9.2 Data Relationships

```
User (1) ──────── (∞) Lists
  │                    │
  └─── (∞) Companies ──┤
           │           │
           └─── (∞) Contacts
```

### 9.3 Indexing Strategy

- **Status-based queries**: `(status, priority)` for job processing
- **User queries**: `user_id` on all user-owned entities
- **List operations**: `list_id` for grouped operations
- **Email lookups**: `email` for duplicate detection
- **Time-based**: `created_at` for chronological queries

---

## 10. Performance & Optimization

### 10.1 Concurrency Management

```typescript
const CONCURRENCY_LIMITS = {
  companyDiscovery: 1,      // Sequential for initial discovery
  companyEnrichment: 7,     // Parallel enrichment
  contactDiscovery: 7,      // Process 7 companies concurrently
  emailEnrichment: 10,      // 10 contacts in parallel
  apiCallsPerProvider: 5    // Max concurrent calls per provider
};
```

### 10.2 Caching Strategy

```typescript
class SearchCache {
  // Company cache (1 hour TTL)
  private companyCache = new LRUCache<string, Company>({
    max: 1000,
    ttl: 3600000
  });
  
  // Contact cache (30 minutes TTL)
  private contactCache = new LRUCache<string, Contact[]>({
    max: 500,
    ttl: 1800000
  });
  
  // Email cache (24 hours TTL)
  private emailCache = new LRUCache<string, string>({
    max: 5000,
    ttl: 86400000
  });
}
```

### 10.3 Performance Metrics

```typescript
interface PerformanceMetrics {
  companyDiscoveryTime: number;    // Target: < 3s
  contactDiscoveryTime: number;    // Target: < 10s
  emailEnrichmentTime: number;     // Target: < 20s
  totalSearchTime: number;         // Target: < 30s
  apiCallCount: number;            // Minimize
  cacheHitRate: number;            // Target: > 30%
  successRate: number;             // Target: > 80%
}
```

### 10.4 Query Optimization

```typescript
// Batch loading to reduce N+1 queries
async function loadCompaniesWithContacts(listId: number) {
  const companies = await db.select()
    .from(companies)
    .where(eq(companies.listId, listId));
  
  const companyIds = companies.map(c => c.id);
  
  const contacts = await db.select()
    .from(contacts)
    .where(inArray(contacts.companyId, companyIds));
  
  // Group contacts by company
  const contactsByCompany = groupBy(contacts, 'companyId');
  
  return companies.map(company => ({
    ...company,
    contacts: contactsByCompany[company.id] || []
  }));
}
```

---

## 11. Testing & Quality Assurance

### 11.1 Test Categories

```typescript
class SearchSystemTests {
  // Unit Tests
  testContactValidator();
  testEmailValidator();
  testDuplicateDetection();
  testScoring();
  
  // Integration Tests
  testPerplexityIntegration();
  testHunterIntegration();
  testDatabaseOperations();
  
  // End-to-End Tests
  testFullSearchFlow();
  testExtensionFlow();
  testProgressiveLoading();
  
  // Performance Tests
  testSearchLatency();
  testConcurrentSearches();
  testMemoryUsage();
}
```

### 11.2 Extension Test Implementation

```typescript
class ExtensionTestSuite {
  async testExtensionFeature(): Promise<TestResult> {
    // 1. Create initial search
    const initialJob = await this.createInitialSearch();
    
    // 2. Wait for completion
    await this.waitForCompletion(initialJob);
    
    // 3. Get initial companies
    const initialCompanies = await this.getCompanies(initialJob);
    
    // 4. Trigger extension
    const extensionResult = await this.triggerExtension(
      initialJob.query,
      initialCompanies
    );
    
    // 5. Validate results
    return this.validateExtension({
      exactCount: extensionResult.companies.length === 5,
      noDuplicates: this.checkDuplicates(extensionResult, initialCompanies),
      hasContacts: this.verifyContacts(extensionResult),
      hasEmails: this.verifyEmails(extensionResult)
    });
  }
}
```

### 11.3 Monitoring & Metrics

```typescript
interface SystemHealth {
  jobQueueDepth: number;
  averageJobLatency: number;
  failureRate: number;
  apiHealth: {
    perplexity: 'healthy' | 'degraded' | 'down';
    hunter: 'healthy' | 'degraded' | 'down';
    apollo: 'healthy' | 'degraded' | 'down';
    aeroLeads: 'healthy' | 'degraded' | 'down';
  };
  databaseConnections: number;
  memoryUsage: number;
  cpuUsage: number;
}
```

---

## 12. Error Handling & Resilience

### 12.1 Error Classification

```typescript
enum ErrorType {
  TRANSIENT = 'transient',      // Network timeout, rate limit
  PERMANENT = 'permanent',      // Invalid API key, bad request
  DATA = 'data',               // Parsing error, validation failure
  SYSTEM = 'system'            // Database error, OOM
}

class ErrorHandler {
  handleError(error: SearchError): ErrorResponse {
    switch (error.type) {
      case ErrorType.TRANSIENT:
        return this.retryWithBackoff(error);
      case ErrorType.PERMANENT:
        return this.failPermanently(error);
      case ErrorType.DATA:
        return this.skipAndContinue(error);
      case ErrorType.SYSTEM:
        return this.alertAndRecover(error);
    }
  }
}
```

### 12.2 Retry Strategy

```typescript
interface RetryConfig {
  maxAttempts: 3;
  backoffMultiplier: 2;
  initialDelay: 1000;
  maxDelay: 30000;
  retryableErrors: ['ETIMEDOUT', 'ECONNRESET', 'RATE_LIMIT'];
}

async function retryWithExponentialBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error, config)) {
        throw error;
      }
      
      const delay = Math.min(
        config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelay
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}
```

### 12.3 Graceful Degradation

```typescript
class GracefulDegradation {
  async searchWithDegradation(query: string): Promise<SearchResult> {
    const result: SearchResult = {
      companies: [],
      contacts: [],
      emails: [],
      degraded: false,
      warnings: []
    };
    
    // Try primary provider
    try {
      result.companies = await this.primarySearch(query);
    } catch (error) {
      result.warnings.push('Using fallback company search');
      result.companies = await this.fallbackSearch(query);
      result.degraded = true;
    }
    
    // Continue with contacts even if some companies failed
    for (const company of result.companies) {
      try {
        const contacts = await this.findContacts(company);
        result.contacts.push(...contacts);
      } catch (error) {
        result.warnings.push(`Failed to find contacts for ${company.name}`);
      }
    }
    
    return result;
  }
}
```

### 12.4 Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = new Date();
    
    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

---

## Appendix A: API Endpoints

### Search Endpoints
- `POST /api/companies/quick-search` - Quick company search
- `POST /api/companies/search` - Full search with contacts
- `POST /api/search-jobs` - Create async search job
- `GET /api/search-jobs/:jobId` - Get job status
- `POST /api/search/extend` - "+5 More" extension

### Admin Endpoints
- `POST /api/admin/test/run-all` - Run all system tests
- `POST /api/admin/test/extension` - Run extension tests
- `GET /api/admin/stats` - System statistics

---

## Appendix B: Configuration

### Environment Variables
```bash
# API Keys
PERPLEXITY_API_KEY=xxx
HUNTER_API_KEY=xxx
APOLLO_API_KEY=xxx
AEROLEADS_API_KEY=xxx

# Database
DATABASE_URL=postgresql://...

# System
NODE_ENV=production
JOB_PROCESSOR_INTERVAL=5000
MAX_CONCURRENT_SEARCHES=7
SEARCH_TIMEOUT=120000
```

### Feature Flags
```typescript
const FEATURES = {
  progressiveLoading: true,
  extensionSearch: true,
  parallelEmailSearch: true,
  smartFallback: true,
  caching: true,
  rateLimiting: true
};
```

---

## Appendix C: Troubleshooting

### Common Issues

1. **Slow Searches**
   - Check API rate limits
   - Verify database indexes
   - Monitor job queue depth

2. **Duplicate Companies**
   - Verify unique constraints
   - Check extension exclusion logic
   - Review list update mechanism

3. **Missing Emails**
   - Check API key validity
   - Review provider fallback chain
   - Verify email validation rules

4. **Job Queue Stuck**
   - Check for stuck jobs in processing
   - Verify job processor is running
   - Review timeout settings

---

## Version History

- **v2.0.0** (October 2025): Complete rewrite with extension system
- **v1.5.0**: Added progressive loading
- **v1.0.0**: Initial release

---

*Document Version: 2.0.0*  
*Last Updated: October 1, 2025*  
*Maintained by: 5Ducks Engineering Team*