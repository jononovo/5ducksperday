# Testing System Architecture

## Overview

The platform includes a comprehensive testing system that validates all critical components including database connectivity, search functionality, API health, and authentication systems. This document provides technical details about the testing architecture and implementation.

## System Components

### Frontend Testing Dashboard
- **Location**: `/testing` page
- **Technology**: React with TypeScript
- **Features**: Real-time test execution, categorized results display, status tracking

### Backend Test Runner
- **Location**: `server/lib/test-runner.ts`
- **Technology**: Node.js with Express
- **Architecture**: Parallel test execution with detailed reporting

## Test Categories

### 1. Database Connectivity Tests
Validates core database operations and data integrity:
- **Replit DB Connection**: Tests database availability and response times
- **Data Retrieval**: Validates company and list data access patterns
- **Schema Integrity**: Verifies database schema operations and relationships

### 2. Search Functionality Tests
Comprehensive validation of search capabilities:
- **Company Quick Search**: Tests search endpoints with sample queries
- **Company Data Retrieval**: Validates data access and filtering
- **Search Configuration**: Tests search approaches and strategy loading

### 3. API Health Tests
External service integration validation:
- **Perplexity AI**: Tests AI service connectivity and response quality
- **Contact Discovery APIs**: Validates AeroLeads, Hunter, Apollo integrations
- **Server Health**: Basic infrastructure health checks

### 4. Authentication System Tests
Security and user management validation:
- **Firebase Admin SDK**: Tests authentication service initialization
- **Token Validation**: Validates JWT token processing and security
- **Session Management**: Tests login/logout flow integrity
- **Auth Middleware**: Verifies protected route security

## API Endpoints

### Primary Test Endpoints

#### Unified Test Runner
```
POST /api/test/run-all
```
Executes complete test suite with parallel processing. Returns comprehensive test report with timing, status, and detailed results for each category.

#### Specialized Test Endpoints
```
POST /api/test/auth        # Authentication tests
POST /api/test/database    # Database connectivity tests  
POST /api/test/search      # Search functionality tests
POST /api/test/health      # API health checks
```

#### Search Quality Testing
```
POST /api/search-test
```
Performs comprehensive search quality assessment with real queries. Includes quality scoring, performance metrics, and result persistence.

#### AI Agent Integration
```
POST /api/agent/run-search-test
```
Automated testing interface designed for AI agent integration. Provides structured results with performance comparisons and historical analysis.

## Test Result Data Model

### Test Result Structure
```typescript
interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  duration?: number;
  error?: string;
  category?: string;
  data?: any;
}
```

### Test Report Format
```typescript
interface TestReport {
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
```

## Data Persistence

### Search Test Results Storage
Test results are persisted for historical analysis and performance tracking:

#### Database Schema
```sql
search_test_results (
  id: serial PRIMARY KEY,
  userId: integer NOT NULL,
  strategyId: integer NOT NULL,
  testId: uuid NOT NULL,
  query: text NOT NULL,
  companyQuality: integer NOT NULL,
  contactQuality: integer NOT NULL,
  emailQuality: integer NOT NULL,
  overallScore: integer NOT NULL,
  status: text DEFAULT 'completed',
  metadata: jsonb DEFAULT '{}',
  createdAt: timestamp DEFAULT NOW()
)
```

#### Storage Operations
- **Create**: `createSearchTestResult()` - Persists new test execution results
- **Retrieve**: `listSearchTestResults()` - Gets user's complete test history
- **Update**: `updateTestResultStatus()` - Updates test status and metadata
- **Analytics**: `getStrategyPerformanceHistory()` - Performance tracking over time

## Quality Assessment System

### Scoring Methodology
The testing system implements multi-dimensional quality scoring:

#### Company Quality Metrics (0-100)
- Data completeness and accuracy validation
- Contact information availability assessment
- Business profile validation checks

#### Contact Quality Metrics (0-100)
- Name confidence scoring algorithms
- Role relevance assessment against search criteria
- Contact information completeness validation

#### Email Quality Metrics (0-100)
- Email format validation and syntax checking
- Domain verification and reputation analysis
- Deliverability scoring based on multiple factors

### Performance Tracking
- **Historical Analysis**: Tracks quality improvements over time
- **Strategy Comparison**: Benchmarks different search approaches
- **Performance Optimization**: Provides feedback for strategy refinement

## Test Execution Flow

### Frontend Execution
1. User initiates test run from testing dashboard
2. Frontend makes POST request to `/api/test/run-all`
3. Real-time status updates during execution
4. Results displayed in categorized format with visual indicators

### Backend Processing
1. **Parallel Execution**: All test suites run simultaneously for efficiency
2. **Sub-test Processing**: Each category contains multiple individual tests
3. **Result Aggregation**: Sub-tests are flattened into individual results
4. **Summary Calculation**: Overall statistics computed from individual results

### Error Handling
- **Network Resilience**: Graceful handling of network failures
- **Test Isolation**: Individual test failures don't affect other tests
- **Timeout Protection**: Duration tracking with timeout safeguards
- **Detailed Logging**: Comprehensive error capture and reporting

## Integration Requirements

### External Service Dependencies
- **Perplexity AI**: Core search intelligence and company analysis
- **Firebase**: Authentication and user session management
- **Contact Discovery APIs**: AeroLeads, Hunter, Apollo for data enrichment
- **Database**: PostgreSQL or Replit Database for data persistence

### Authentication Requirements
- All test endpoints require valid user authentication
- User-specific test result segregation and access control
- Secure API key management for external services

## Monitoring and Observability

### Logging System
- **Structured Logging**: JSON-formatted logs for all test operations
- **Performance Metrics**: Duration tracking for all test components
- **Error Tracking**: Comprehensive error capture with stack traces

### Health Monitoring
- **Service Status**: Real-time health checks for all dependencies
- **Dependency Monitoring**: External service availability tracking
- **Performance Benchmarking**: Historical performance analysis and trending

## Usage Examples

### Running Complete Test Suite
```javascript
// Frontend usage
const response = await fetch('/api/test/run-all', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const testReport = await response.json();
```

### Search Quality Testing
```javascript
// Test specific search strategy
const response = await fetch('/api/search-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategyId: 1,
    query: "software companies in San Francisco"
  })
});
const qualityResults = await response.json();
```

### AI Agent Integration
```javascript
// Automated testing for AI agents
const response = await fetch('/api/agent/run-search-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    strategyId: 2,
    query: "fintech startups in New York"
  })
});
const agentResults = await response.json();
```

## Best Practices

### Test Development
- Write comprehensive sub-tests for each major component
- Implement proper error handling and timeout protection
- Use structured logging for debugging and monitoring
- Maintain test isolation to prevent cascading failures

### Performance Optimization
- Use parallel execution for independent test suites
- Implement caching for frequently accessed test data
- Monitor test execution times and optimize slow tests
- Use connection pooling for database operations

### Security Considerations
- Validate all input parameters for test endpoints
- Implement proper authentication and authorization
- Secure storage of API keys and sensitive test data
- Use secure communication protocols for external service calls

This testing system provides comprehensive validation capabilities while maintaining high performance and detailed observability for continuous platform improvement.