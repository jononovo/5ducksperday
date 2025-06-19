# 5 Ducks Search System Technical Documentation

This technical document provides a comprehensive guide for developers and AI agents who need to edit, improve, or add new search capabilities to the 5 Ducks sales intelligence platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Components](#key-components)
3. [Core Search Modules](#core-search-modules)
4. [Search Flow](#search-flow)
5. [Adding New Search Modules](#adding-new-search-modules)
6. [Customizing Existing Modules](#customizing-existing-modules)
7. [Contact Validation System](#contact-validation-system)
8. [Email Discovery System](#email-discovery-system)
9. [External API Integrations](#external-api-integrations)
10. [Configuration Reference](#configuration-reference)
11. [Troubleshooting Guide](#troubleshooting-guide)
12. [Search Versions Comparison](#search-versions-comparison)
13. [Performance Optimization](#performance-optimization)

## Architecture Overview

The search system employs a modular architecture with several key design principles:

- **Pipeline Processing**: Data flows through sequential search modules
- **Strategy Pattern**: Multiple search implementations for each module
- **Validation Chain**: Multi-level validation for contact and email information
- **Configurable Execution**: Dynamic selection of modules and strategies
- **Result Merging**: Combining results from multiple sources with smart deduplication

## Key Components

### Core Files and Their Purposes

| File Path | Purpose |
|-----------|---------|
| `server/lib/search-modules.ts` | Central module definitions and search module implementations |
| `server/lib/perplexity.ts` | Perplexity AI integration for company and contact analysis |
| `server/lib/api/perplexity-client.ts` | Low-level client for Perplexity API communication |
| `server/lib/search-logic/shared/types.ts` | Common type definitions for search functionality |
| `server/lib/search-logic/shared/utils.ts` | Shared utility functions for search operations |
| `server/lib/search-logic/email-discovery/index.ts` | Email discovery module configuration |
| `server/lib/search-logic/email-discovery/service.ts` | Email discovery service implementation |
| `server/lib/results-analysis/contact-analysis.ts` | Contact data analysis and validation |
| `server/lib/results-analysis/email-analysis.ts` | Email validation and scoring |
| `server/routes.ts` | API endpoints for search operations |

### Key Interfaces

```typescript
// Main search module interface (server/lib/search-modules.ts)
export interface SearchModule {
  execute(context: SearchModuleContext): Promise<SearchModuleResult>;
  validate(result: SearchModuleResult): Promise<boolean>;
  merge?(current: SearchModuleResult, previous?: SearchModuleResult): SearchModuleResult;
}

// Search implementation interface (server/lib/search-logic/shared/types.ts)
export interface SearchImplementation {
  execute: (context: SearchContext) => Promise<SearchResult[]>;
  validate?: (result: SearchResult) => Promise<boolean>;
  name: string;
  description: string;
}

// Email search strategy interface (server/lib/search-logic/email-discovery/types.ts)
export interface EmailSearchStrategy {
  name: string;
  description: string;
  execute(context: EmailSearchContext): Promise<EmailSearchResult>;
}
```

## Core Search Modules

### 1. Company Overview Module

**Purpose**: Discover and analyze companies based on search criteria

**Key Files**:
- `server/lib/search-modules.ts` - `CompanyOverviewModule` class
- `server/lib/perplexity.ts` - `searchCompanies` and `analyzeCompany` functions

**Execution Flow**:
1. Takes a query string input
2. Searches for companies using Perplexity AI
3. Analyzes each company to extract details
4. Returns company data with metadata

### 2. Decision Maker Module

**Purpose**: Identify key decision-makers and contacts at companies

**Key Files**:
- `server/lib/search-modules.ts` - `DecisionMakerModule` class
- `server/lib/results-analysis/contact-analysis.ts`
- `server/lib/results-analysis/contact-name-validation.ts`

**Execution Flow**:
1. Takes company data from previous module
2. Executes specialized searches to identify key personnel
3. Extracts and validates contact information
4. Returns validated contact data

### 3. Email Discovery Module

**Purpose**: Find email addresses for identified contacts

**Key Files**:
- `server/lib/search-modules.ts` - `EmailDiscoveryModule` class
- `server/lib/search-logic/email-discovery/service.ts`
- `server/lib/search-logic/email-discovery/strategies/` - Strategy implementations

**Execution Flow**:
1. Takes company and contact data from previous modules
2. Executes multiple email discovery strategies
3. Validates and scores discovered emails
4. Returns contacts with email information

### 4. Local Sources Module

**Purpose**: Find additional information from local business sources

**Key Files**:
- `server/lib/search-modules.ts` - `LocalSourcesModule` class
- `server/lib/search-logic/deep-searches/local-sources/` - Local source implementations

**Execution Flow**:
1. Takes a query or company name
2. Searches local business associations and directories
3. Extracts additional company and contact details
4. Returns supplementary information

## Search Flow

The overall search flow follows these steps:

1. **Initiation**: API request to `/api/companies/search` with query
2. **Company Search**: Perplexity AI search for relevant companies
3. **Module Execution**: Sequential execution of configured search modules
4. **Result Collection**: Data collection from each module
5. **Data Storage**: Storing results in database
6. **Post-Processing**: Optional enrichment of high-value contacts
7. **Response**: Return search results to client

### Sequence Diagram

```
Client -> API: POST /api/companies/search
API -> CompanyOverviewModule: execute(query)
CompanyOverviewModule -> Perplexity: searchCompanies(query)
Perplexity --> CompanyOverviewModule: company list
CompanyOverviewModule -> DecisionMakerModule: execute(companies)
DecisionMakerModule -> Perplexity: analyzeCompany(company)
Perplexity --> DecisionMakerModule: contact information
DecisionMakerModule -> EmailDiscoveryModule: execute(companies, contacts)
EmailDiscoveryModule -> EmailStrategies: execute(company)
EmailStrategies --> EmailDiscoveryModule: email results
EmailDiscoveryModule --> API: search results
API -> Database: store results
API --> Client: search response
```

## Adding New Search Modules

To create a new search module:

1. **Define Module Configuration**:
   - Add a new module configuration in `server/lib/search-modules.ts`
   - Define default prompts, technical prompts, and response structure

```typescript
export const NEW_MODULE = {
  type: 'new_module_type',
  defaultPrompt: "Your default prompt here",
  technicalPrompt: `Technical prompt with detailed instructions`,
  responseStructure: {
    // Define expected response structure
  },
  defaultEnabledFor: ['target_module_types']
};
```

2. **Implement Module Class**:
   - Create a new class that implements the `SearchModule` interface
   - Implement `execute`, `validate`, and optionally `merge` methods

```typescript
export class NewModule implements SearchModule {
  async execute({ query, config, previousResults }: SearchModuleContext): Promise<SearchModuleResult> {
    // Implementation logic
    return {
      companies: [], // Company data 
      contacts: [],  // Contact data
      metadata: {
        moduleType: 'new_module_type',
        completedSearches: [],
        validationScores: {}
      }
    };
  }

  async validate(result: SearchModuleResult): Promise<boolean> {
    // Validation logic
    return true;
  }
}
```

3. **Register Module**:
   - Add to `SEARCH_MODULES` object in `server/lib/search-modules.ts`
   - Add creation logic in `createSearchModule` function

```typescript
// Add to SEARCH_MODULES
export const SEARCH_MODULES = {
  company_overview: COMPANY_OVERVIEW_MODULE,
  decision_maker: DECISION_MAKER_MODULE,
  email_discovery: EMAIL_DISCOVERY_MODULE,
  local_sources: LOCAL_SOURCES_MODULE,
  new_module_type: NEW_MODULE // Add new module here
};

// Add to createSearchModule function
export function createSearchModule(moduleType: string): SearchModule {
  switch (moduleType) {
    case 'company_overview':
      return new CompanyOverviewModule();
    case 'decision_maker':
      return new DecisionMakerModule();
    case 'email_discovery':
      return new EmailDiscoveryModule();
    case 'local_sources':
      return new LocalSourcesModule();
    case 'new_module_type': // Add case for new module
      return new NewModule();
    default:
      throw new Error(`Unknown module type: ${moduleType}`);
  }
}
```

4. **Create Search Implementations**:
   - Add implementations in appropriate subdirectory of `server/lib/search-logic/`
   - Implement the `SearchImplementation` interface for each strategy

## Customizing Existing Modules

To modify an existing search module:

1. **Adjust Configuration**:
   - Update module configuration in `server/lib/search-modules.ts`
   - Modify prompts, response structures, or validation rules

```typescript
// Example: Improving Decision Maker module prompt
export const DECISION_MAKER_MODULE = {
  type: 'decision_maker',
  defaultPrompt: "Find key decision makers at [COMPANY] including C-level executives, department heads, and founders",
  technicalPrompt: `You are a business intelligence researcher focused on identifying key decision makers.
    For [COMPANY], find all leadership personnel including:
    1. C-suite executives (CEO, CTO, CFO, etc.)
    2. Department heads and directors
    3. Founders and owners
    4. Board members
    
    Include their full names, roles/titles, and departments when available.
    Prioritize finding direct contact information.`,
  // Other config properties...
};
```

2. **Add New Strategies**:
   - Implement new strategies in the appropriate directories
   - Register them in the module's strategy list

```typescript
// Example: Adding a new email discovery strategy in server/lib/search-logic/email-discovery/strategies/new-strategy.ts
import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';

export const newStrategy: EmailSearchStrategy = {
  name: "Advanced Domain Analysis",
  description: "Uses DNS records and WHOIS data to find administrative contacts",
  
  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyDomain } = context;
    
    // Implementation logic...
    
    return {
      source: "advanced_domain_analysis",
      emails: ["discovered@email.com"],
      metadata: {
        searchDate: new Date().toISOString(),
        methodsUsed: ["whois", "dns_lookup", "historical_records"]
      }
    };
  }
};

// Then register in server/lib/search-logic/email-discovery/index.ts
import { newStrategy } from './strategies/new-strategy';

export const emailDiscoveryModule = {
  // Existing properties...
  searches: [
    // Existing strategies...
    {
      id: "advanced-domain-analysis",
      label: "Advanced Domain Analysis",
      description: "Uses DNS records and WHOIS data to find administrative contacts",
      implementation: newStrategy,
      defaultEnabled: true
    }
  ]
};
```

3. **Modify Execution Logic**:
   - Update the `execute` method in the module class
   - Adjust validation or result processing as needed

```typescript
// Example: Enhancing the decision maker module's execute method
async execute({ query, config, previousResults }: SearchModuleContext): Promise<SearchModuleResult> {
  const companies = previousResults?.companies || [];
  const contacts: Array<Partial<Contact>> = [];
  const completedSearches: string[] = [];
  const validationScores: Record<string, number> = {};

  // Add new processing logic
  for (const company of companies) {
    // Add advanced executive search
    try {
      const executiveResult = await this.searchExecutiveProfiles(company.name);
      if (executiveResult) {
        completedSearches.push('executive-profile-search');
        // Process executive search results...
      }
    } catch (error) {
      console.error('Executive search error:', error);
    }
    
    // Existing processing logic...
  }
  
  // Return results
  return {
    companies,
    contacts,
    metadata: {
      moduleType: 'decision_maker',
      completedSearches,
      validationScores
    }
  };
}

// Add new helper method
private async searchExecutiveProfiles(companyName: string): Promise<string | null> {
  // Implementation...
}
```

4. **Update Result Processing**:
   - Modify how results are combined or filtered
   - Adjust confidence scoring mechanisms

```typescript
// Example: Enhanced filtering in the email discovery module
const validatedEmails = emailsFound.filter(email => {
  if (isPlaceholderEmail(email)) return false;
  
  // Apply enhanced validation
  const validationScore = validateEmailEnhanced(email, {
    minimumPatternScore: 65,
    domainCheck: true,
    nameValidation: true,
    crossReferenceValidation: true // New option
  });
  
  // Add scoring logic with additional checks
  if (company.domain && !email.endsWith('@' + company.domain)) {
    // Apply penalty for non-company domain emails
    return validationScore >= 75; // Higher threshold for non-company domains
  }
  
  return validationScore >= 50; // Standard threshold
});
```

## Contact Validation System

The contact validation system consists of multiple layers:

### Name Validation

**Key Files**:
- `server/lib/results-analysis/contact-name-validation.ts`
- `server/lib/search-logic/contact-discovery/enhanced-name-parsing.ts`
- `server/lib/results-analysis/contact-ai-name-scorer.ts`

**Validation Process**:
1. Extract potential names using regex patterns
2. Filter out placeholder or generic names
3. Apply format validation (first/last name structure)
4. Check against company name to prevent company-as-contact errors
5. Apply AI-based validation for higher accuracy
6. Combine multiple scores for final confidence score

### Role Validation

**Key Files**:
- `server/lib/results-analysis/contact-analysis.ts`

**Validation Process**:
1. Extract role information using regex patterns
2. Normalize role titles
3. Apply role-specific confidence adjustments
4. Separate departments from individual roles

## Email Discovery System

The email discovery system uses multiple strategies:

### Strategy Implementation

**Key Files**:
- `server/lib/search-logic/email-discovery/strategies/` - All strategy implementations
- `server/lib/search-logic/email-discovery/service.ts` - Service that coordinates strategies

**Available Strategies**:
1. `website-crawler.ts` - Extracts emails from company websites
2. `pattern-prediction.ts` - Predicts emails based on common formats
3. `enhanced-pattern-prediction.ts` - Advanced pattern prediction
4. `public-directory.ts` - Searches public directories
5. `social-profile.ts` - Extracts from social media profiles
6. `domain-analysis.ts` - Analyzes domain records

### Email Validation

**Key Files**:
- `server/lib/results-analysis/email-analysis.ts`
- `server/lib/search-logic/email-discovery/enhanced-validation.ts`

**Validation Process**:
1. Check email format and structure
2. Validate domain existence
3. Check for placeholder patterns
4. Apply business domain likelihood scoring
5. Combine scores for final confidence rating

## External API Integrations

### Perplexity AI

**Key Files**:
- `server/lib/api/perplexity-client.ts`
- `server/lib/perplexity.ts`

**Integration Points**:
- Company search and analysis
- Contact discovery and validation
- Email validation

**Example Usage**:
```typescript
// Basic usage
const companyResults = await searchCompanies("tech startups in Boston");

// Detailed company analysis
const companyDetails = await analyzeCompany(
  "Acme Corporation",
  "Analyze this company's size, industry, and key products",
  null,
  null
);

// With technical prompt and response structure
const contactResults = await analyzeCompany(
  "Acme Corporation",
  "Find key decision makers",
  `You are a business researcher. Identify leadership at this company.`,
  {
    contacts: [
      { name: "string", role: "string", department: "string" }
    ]
  }
);
```

### AeroLeads

**Key Files**:
- `server/lib/search-logic/email-discovery/aeroleads-search.ts`

**Integration Points**:
- Email verification
- Contact enrichment

**Example Usage**:
```typescript
// Example usage in routes.ts
const { searchAeroLeads } = await import('./lib/search-logic/email-discovery/aeroleads-search');
const result = await searchAeroLeads(
  contact.name,
  company.name,
  process.env.AEROLEADS_API_KEY
);

// Process results
if (result.success && result.data.email) {
  // Update contact with verified email
  await storage.updateContact(contactId, {
    email: result.data.email,
    probability: result.data.score || 85,
    verificationSource: 'AeroLeads'
  });
}
```

## Configuration Reference

### Search Module Configuration

Each search module is configured with these properties:

```typescript
{
  type: string,              // Module type identifier
  defaultPrompt: string,     // User-friendly prompt
  technicalPrompt: string,   // Detailed technical prompt for AI
  responseStructure: object, // Expected response structure
  validationRules: {         // Rules for result validation
    minimumConfidence: number,
    requireRole: boolean,
    requireDepartment: boolean
  },
  defaultEnabledFor: string[] // Which search types this is enabled for
}
```

### Search Context

When implementing new search strategies, use this context object:

```typescript
export interface SearchContext {
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  config: SearchModuleConfig;
  topProspects?: TopProspect[];
  options?: {
    timeout?: number;
    maxDepth?: number;
    maxResults?: number;
    filters?: Record<string, unknown>;
  };
}
```

### Email Search Context

For email discovery strategies:

```typescript
export interface EmailSearchContext {
  companyName: string;
  companyWebsite?: string;
  companyDomain?: string;
  maxDepth?: number;
  timeout?: number;
  existingContacts?: Array<{
    name: string;
    email?: string;
  }>;
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Low-Quality Contact Names

**Symptoms**:
- Extracted contacts include department names or generic roles
- Names appear as incomplete or single words
- Company names appearing as contact names

**Fixes**:
- Adjust name validation in `server/lib/results-analysis/contact-name-validation.ts`
- Increase `minimumScore` threshold in validation options
- Add more comprehensive name format validation rules
- Strengthen company name similarity check

```typescript
// Example fix in contact-name-validation.ts
function validateName(name: string, context: string, companyName: string): NameValidationResult {
  // Add more strict name format validation
  if (!name.includes(' ') || name.length < 5) {
    return {
      score: 0,
      isGeneric: true,
      confidence: 0,
      name,
      validationSteps: [{
        name: "format_check",
        score: 0,
        weight: 1,
        reason: "Name appears to be too short or missing spaces"
      }]
    };
  }
  
  // Continue with existing validation...
}
```

#### 2. Email Discovery Not Finding Results

**Symptoms**:
- Email discovery strategies return empty results
- Low confidence scores for discovered emails
- Timeout errors in web crawling

**Fixes**:
- Check timeouts in crawler strategy
- Verify domain extraction is working correctly
- Add more fallback patterns to pattern prediction
- Enable multiple strategies in parallel

```typescript
// Example enhancement in domain extraction
export function extractDomainFromContext(text: string): string | null {
  // Improved regex for domain extraction
  const domainRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g;
  const matches = [...text.matchAll(domainRegex)];
  
  if (matches.length > 0) {
    const domains = matches.map(match => match[1]);
    
    // Filter for business domains, prioritize .com
    const businessDomains = domains.filter(d => 
      !d.includes('facebook.com') && 
      !d.includes('linkedin.com') &&
      !d.includes('twitter.com')
    );
    
    return businessDomains[0] || domains[0] || null;
  }
  
  return null;
}
```

#### 3. Perplexity API Failures

**Symptoms**:
- Search fails with API errors
- Timeout errors from Perplexity
- Rate limiting errors

**Fixes**:
- Implement retry logic with exponential backoff
- Add error handling to recover partial results
- Cache common searches to reduce API calls

```typescript
// Example retry logic for Perplexity client
async function queryPerplexityWithRetry(
  messages: PerplexityMessage[],
  maxRetries = 3,
  backoffMs = 1000
): Promise<string> {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryPerplexity(messages);
    } catch (error) {
      console.error(`Perplexity API error (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error;
      
      // Check if it's a rate limit error
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        // Wait longer for rate limit errors
        await new Promise(resolve => setTimeout(resolve, backoffMs * 3));
      } else {
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
      
      // Increase backoff for next attempt
      backoffMs *= 2;
    }
  }
  
  throw lastError || new Error('Failed after multiple retry attempts');
}
```

## Search Versions Comparison

The system supports multiple "versions" of search functionality, each with different characteristics:

### Basic Search (v1)

**Key Characteristics**:
- Uses simple regex-based extraction
- Lower validation thresholds
- Faster but less accurate
- Suitable for quick results

**Configuration**:
```typescript
// Example configuration for basic search
{
  useEnhancedValidation: false,
  minimumNameScore: 30,
  minimumConfidence: 30,
  searchOptions: {
    timeout: 5000,
    maxDepth: 1
  }
}
```

### Enhanced Search (v2)

**Key Characteristics**:
- Uses enhanced contact validation
- Higher confidence thresholds
- More thorough email validation
- Better deduplication and merging

**Configuration**:
```typescript
// Example configuration for enhanced search
{
  useEnhancedValidation: true,
  minimumNameScore: 65,
  minimumConfidence: 50,
  searchOptions: {
    timeout: 15000,
    maxDepth: 2,
    enhancedNameValidation: true
  }
}
```

### AI-Assisted Search (v3)

**Key Characteristics**:
- Uses AI for validation and scoring
- Multiple enrichment passes
- Cross-references data from multiple sources
- Highest accuracy but slower performance

**Configuration**:
```typescript
// Example configuration for AI-assisted search
{
  useEnhancedValidation: true,
  minimumNameScore: 75,
  minimumConfidence: 60,
  searchOptions: {
    timeout: 30000,
    maxDepth: 3,
    enhancedNameValidation: true,
    useAIValidation: true,
    crossReferenceValidation: true
  }
}
```

## Performance Optimization

### Strategies for Improving Search Performance

1. **Parallel Processing**:
   - Use `Promise.all` to run multiple searches in parallel
   - Implement concurrency limits to prevent overwhelming external APIs

```typescript
// Example of parallel processing with concurrency limit
async function runWithConcurrencyLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  
  for (const task of tasks) {
    const p = Promise.resolve().then(() => task()).then(result => {
      results.push(result);
      executing.splice(executing.indexOf(p), 1);
    });
    
    executing.push(p);
    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
}

// Usage in a search module
const searchTasks = companies.map(company => 
  () => this.searchCompanyDetails(company.name)
);

const searchResults = await runWithConcurrencyLimit(searchTasks, 3);
```

2. **Caching**:
   - Implement a cache for repeated searches
   - Cache domain information and validation results

```typescript
// Simple in-memory cache implementation
class SearchCache {
  private cache: Map<string, { result: any, timestamp: number }> = new Map();
  private ttlMs: number;
  
  constructor(ttlMinutes = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }
  
  set(key: string, result: any): void {
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }
}

// Usage
const searchCache = new SearchCache();

// In search function
const cacheKey = `company:${companyName}`;
const cachedResult = searchCache.get(cacheKey);
if (cachedResult) {
  return cachedResult;
}

const result = await performSearch(companyName);
searchCache.set(cacheKey, result);
return result;
```

3. **Early Termination**:
   - Stop searches when sufficient quality data is found
   - Implement quality thresholds to skip unnecessary processing

```typescript
// Example of early termination
async execute({ query, config, previousResults }: SearchModuleContext): Promise<SearchModuleResult> {
  // Check if we already have high-quality results
  if (previousResults?.contacts && previousResults.contacts.length > 0) {
    const highQualityContacts = previousResults.contacts.filter(
      c => c.probability && c.probability >= 85 && c.email
    );
    
    // If we already have sufficient high-quality contacts, skip additional processing
    if (highQualityContacts.length >= 3) {
      console.log('Skipping additional processing - already have high-quality contacts');
      return {
        companies: previousResults.companies,
        contacts: previousResults.contacts,
        metadata: {
          moduleType: 'email_discovery',
          completedSearches: ['skipped_due_to_quality'],
          validationScores: {}
        }
      };
    }
  }
  
  // Continue with normal processing...
}
```

4. **Incremental Processing**:
   - Process results incrementally rather than all at once
   - Return preliminary results quickly, then enhance

```typescript
// Example of incremental processing in API route
app.post("/api/companies/search", requireAuth, async (req, res) => {
  // Extract query
  const { query } = req.body;
  
  // Start search asynchronously
  const searchPromise = performCompanySearch(query, req.user!.id);
  
  // Return preliminary results quickly
  const preliminaryResults = await getInitialResults(query);
  res.json({
    companies: preliminaryResults,
    pending: true,
    searchId: searchId
  });
  
  // Continue processing in background
  searchPromise.then(finalResults => {
    // Store final results
    storeSearchResults(searchId, finalResults);
  }).catch(error => {
    console.error('Search error:', error);
  });
});

// Client can poll for completion
app.get("/api/companies/search/:searchId", requireAuth, async (req, res) => {
  const { searchId } = req.params;
  const results = await getStoredSearchResults(searchId);
  
  res.json({
    ...results,
    pending: !results.completed
  });
});
```

These optimization techniques can significantly improve search performance and user experience while maintaining search quality.