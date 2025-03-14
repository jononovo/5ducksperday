# Build Page Technical Documentation

## Overview

The Build page (`client/src/pages/build.tsx`) is a central component of the 5 Ducks system, responsible for search strategy testing, benchmarking, and analysis. It provides a comprehensive interface for evaluating and improving the quality of search strategies, which are fundamental to the platform's contact discovery capabilities.

## Purpose

The Build page serves several key functions within the application:

1. **Search Strategy Testing**: Allows users to test search strategies against specific queries
2. **Quality Benchmarking**: Measures and displays quality metrics for search results
3. **Performance History**: Tracks strategy performance over time
4. **Strategy Comparison**: Enables users to compare different search strategies

## Component Structure

### Main Components

The Build page consists of the following primary components:

1. **Test Configuration Card** - Allows selection of test query and search strategy
2. **Test Results Table** - Displays results from recent search tests with quality metrics
3. **SearchTestResults** - Dedicated component showing test results from database
4. **StrategyPerformanceChart** - Visualizes performance metrics over time

### Data Flow

1. User selects a search strategy and enters a test query
2. API request is made to `/api/search-test` endpoint
3. Test results are stored both locally (localStorage) and in the database
4. Results are displayed in the Test Results Table and SearchTestResults component
5. Performance data is visualized through the StrategyPerformanceChart

## Quality Metrics

The Build page evaluates search strategies based on several quality dimensions:

1. **Company Quality**: Measures accuracy of company information (0-100)
2. **Contact Quality**: Measures accuracy of contact information (0-100)
3. **Email Quality**: Measures accuracy of email addresses (0-100)
4. **Overall Score**: Combined metric weighted across all dimensions (0-100)

Quality scores are visually color-coded:
- **Green (80-100)**: High quality
- **Yellow (60-79)**: Medium quality
- **Red (0-59)**: Low quality

## API Endpoints

The Build page interacts with the following API endpoints:

1. **GET /api/search-approaches** - Fetches available search strategies
2. **POST /api/search-approaches/initialize** - Initializes default strategies
3. **POST /api/search-test** - Executes a search test and returns results
4. **POST /api/search-test-results** - Persists test results to database
5. **GET /api/search-test-results** - Retrieves all test results
6. **GET /api/search-test-results/strategy/:id** - Retrieves results for a specific strategy

## Core Components

### SearchTestResults Component (`client/src/components/search-test-results.tsx`)

This component fetches and displays test results from the database, offering a persistent view of test history with the following features:

- Query-based filtering by strategy ID
- Limit control for result count
- Color-coded quality metrics
- Status badges for test states (completed, running, failed)

### StrategyPerformanceChart Component (`client/src/components/strategy-performance-chart.tsx`)

This component visualizes strategy performance over time with:

- Line chart showing quality scores
- Trend analysis
- Strategy-specific filtering

## State Management

The Build page manages several state elements:

1. **testQuery**: Current query string for testing
2. **selectedStrategy**: Currently selected search strategy ID
3. **testResults**: Array of test results (both from localStorage and API)
4. **isRunningTest**: Boolean flag to indicate test in progress

## Implementation Details

### Test Execution Process

1. User initiates test with strategy selection and query
2. Initial "running" state is created and displayed
3. API call is made to run the search test
4. Results are processed and quality metrics extracted
5. Results are displayed and stored in both localStorage and database

### UUID Generation

Test results use UUID generation to ensure unique identifiers. The page attempts to use `crypto.randomUUID()` with a fallback to timestamp-based IDs.

### Error Handling

The page implements comprehensive error handling for:

- API failures during test execution
- Failed test states
- Database persistence errors

## Database Structure

Test results are stored in the `search_test_results` table with the following schema:

- **id**: Auto-incremented primary key
- **testId**: Unique identifier for the test (UUID)
- **strategyId**: Foreign key to search strategy
- **query**: The search query used for testing
- **companyQuality**: Score for company information quality
- **contactQuality**: Score for contact information quality
- **emailQuality**: Score for email quality
- **overallScore**: Combined quality score
- **status**: Test status (completed, running, failed)
- **metadata**: JSON field containing additional test data
- **createdAt**: Timestamp of test creation

## Sequence Flow

1. Page load → Fetch search strategies and existing test results
2. User selects strategy and enters query
3. User clicks "Run Test" → Create initial running state
4. API call made → Backend processes search
5. Results received → Update UI with metrics
6. Results saved to database → Update performance chart

## Optimization Considerations

- Use of memoization for performance-sensitive components
- Careful management of API calls to reduce server load
- Efficient state updates to minimize re-renders

## Future Enhancements

Potential areas for improvement include:

1. Real-time updates for long-running tests
2. More detailed result breakdowns
3. A/B testing for strategy comparison
4. Automated strategy optimization

## Troubleshooting

Common issues and solutions:

1. **Missing Test Results**: Check database connection and API endpoints
2. **Strategy Performance Issues**: Verify metrics calculation in backend
3. **UI Rendering Problems**: Check data structure compatibility between API and components