# Resilient Search System Documentation

## Overview
The search system has been transformed from an ephemeral, localStorage-based system to a **resilient, persistent system** that can survive page refreshes, server restarts, and be triggered programmatically from backend processes.

## Key Features

### 1. Database-Persistent Job Queue
- All search requests are stored in the `search_jobs` table
- Jobs have unique UUIDs and track status, progress, results, and retry attempts
- Jobs persist across server restarts and page refreshes

### 2. Background Job Processor
- Runs every 5 seconds checking for pending jobs
- Processes jobs asynchronously in the background
- Automatic retry logic (max 3 attempts) with exponential backoff
- Priority-based execution (higher priority jobs run first)

### 3. Programmatic Search Activation
- Searches can be triggered from:
  - Cron jobs (scheduled searches)
  - Webhooks (event-driven searches)
  - API calls (external integrations)
  - Internal processes (batch operations)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  - Creates search jobs via API                               │
│  - Polls job status for progress                             │
│  - Displays results when complete                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Endpoints                             │
│  POST /api/search-jobs         - Create new job              │
│  GET  /api/search-jobs/:jobId  - Check status/results        │
│  GET  /api/search-jobs         - List user's jobs            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                 SearchJobService                             │
│  - Creates jobs in database                                  │
│  - Executes search logic                                     │
│  - Updates job progress                                      │
│  - Handles retries and errors                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              Background Job Processor                        │
│  - Polls database every 5 seconds                            │
│  - Picks up pending jobs                                     │
│  - Executes searches asynchronously                          │
│  - Updates job status and results                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  search_jobs table:                                          │
│  - Stores all job data persistently                          │
│  - Survives server restarts                                  │
│  - Enables job history and analytics                         │
└──────────────────────────────────────────────────────────────┘
```

## Usage Examples

### 1. Creating a Search Job Programmatically

```typescript
import { SearchJobService } from "./services/search-job-service";

// Create a search job
const jobId = await SearchJobService.createJob({
  userId: 1,
  query: "Find AI companies in healthcare",
  searchType: "companies",
  contactSearchConfig: {
    enableCoreLeadership: true,
    customSearchTarget: "CEO, CTO"
  },
  source: "api",
  metadata: { purpose: "Weekly analysis" },
  priority: 5
});

// Check job status
const job = await SearchJobService.getJob(jobId, userId);
console.log(job.status); // 'pending', 'processing', 'completed', or 'failed'
```

### 2. Daily Scheduled Search (Cron Job)

```typescript
import { executeDailyTrendingCompaniesSearch } from "./cron-examples/daily-search";

// Run this in your cron scheduler (e.g., at 9 AM daily)
await executeDailyTrendingCompaniesSearch();
```

### 3. Event-Driven Search

```typescript
import { executeEventTriggeredSearch } from "./cron-examples/daily-search";

// Trigger search when user signs up
await executeEventTriggeredSearch(
  userId,
  "user_signup",
  { industry: "technology" }
);

// Trigger search when payment received
await executeEventTriggeredSearch(
  userId,
  "payment_received",
  { customerIndustry: "SaaS" }
);
```

### 4. Batch Processing

```typescript
import { executeBatchSearches } from "./cron-examples/daily-search";

// Process multiple searches
await executeBatchSearches([
  { userId: 1, query: "AI startups", priority: 5 },
  { userId: 2, query: "Fintech companies", priority: 3 },
  { userId: 3, query: "Healthcare SaaS", priority: 7 }
]);
```

## Job Lifecycle

1. **Created** → Job is created with status `pending`
2. **Processing** → Job processor picks it up and marks as `processing`
3. **Execution** → Search logic runs (Perplexity API, contact discovery, etc.)
4. **Completion** → Job marked as `completed` with results, or `failed` with error
5. **Retry** → Failed jobs retry up to 3 times before permanent failure

## API Endpoints

### Create Search Job
```http
POST /api/search-jobs
Content-Type: application/json

{
  "query": "Find AI companies in healthcare",
  "searchType": "companies",
  "contactSearchConfig": {
    "enableCoreLeadership": true
  },
  "metadata": {
    "source": "manual"
  }
}

Response:
{
  "jobId": "uuid-here",
  "status": "pending"
}
```

### Check Job Status
```http
GET /api/search-jobs/:jobId

Response:
{
  "jobId": "uuid-here",
  "status": "completed",
  "progress": {
    "phase": "Complete",
    "completed": 5,
    "total": 5
  },
  "results": {
    "companies": [...],
    "contacts": [...]
  }
}
```

### List User's Jobs
```http
GET /api/search-jobs?limit=10

Response:
[
  {
    "jobId": "uuid-1",
    "query": "AI startups",
    "status": "completed",
    "createdAt": "2025-09-27T04:48:32Z"
  },
  ...
]
```

## Database Schema

```sql
CREATE TABLE search_jobs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  job_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  search_type TEXT NOT NULL DEFAULT 'companies',
  contact_search_config JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  progress JSONB DEFAULT '{}',
  results JSONB,
  result_count INTEGER DEFAULT 0,
  error TEXT,
  source TEXT NOT NULL DEFAULT 'frontend',
  metadata JSONB DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);
```

## Benefits

1. **Resilience**: Jobs survive server crashes and restarts
2. **Scalability**: Can handle thousands of concurrent searches
3. **Flexibility**: Trigger from anywhere (cron, webhooks, APIs)
4. **Reliability**: Automatic retries for failed searches
5. **Visibility**: Track all searches and their outcomes
6. **Performance**: Async processing doesn't block the UI
7. **History**: Complete audit trail of all searches

## Testing

Run the test script to verify the system:
```bash
tsx server/search/test-programmatic-search.ts
```

This will create a test job and demonstrate the full lifecycle.

## Monitoring

Check job processor status in server logs:
```
[JobProcessor] No pending jobs found
[JobProcessor] Starting to process job uuid-here
[SearchJobService] Completed job uuid-here with X companies
```

## Maintenance

### Clean up old jobs (run weekly)
```typescript
import { cleanupOldJobs } from "./cron-examples/daily-search";
await cleanupOldJobs(30); // Keep jobs for 30 days
```

### Retry failed jobs (run hourly)
```typescript
import { retryFailedJobs } from "./cron-examples/daily-search";
await retryFailedJobs();
```

## Future Enhancements

- [ ] Add webhook notifications for job completion
- [ ] Implement job cancellation
- [ ] Add job scheduling (run at specific times)
- [ ] Create admin dashboard for job monitoring
- [ ] Add job templates for common searches
- [ ] Implement job dependencies (chains of searches)
- [ ] Add rate limiting per user
- [ ] Create job analytics and reporting