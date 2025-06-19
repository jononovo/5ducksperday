# N8N Webhook Integration Guide

This document explains how the 5 Ducks platform integrates with N8N for decoupled search workflows.

## Overview

The 5 Ducks platform has implemented a webhook-based integration with N8N workflows to decouple search logic from the main application. This approach allows search strategies to be defined and modified in N8N without requiring changes to the 5 Ducks codebase.

### Components

1. **Search Request API** - Sends search queries to N8N workflows
2. **Webhook Endpoint** - Receives search results from N8N workflows 
3. **Webhook Logging** - Logs all communications with N8N for monitoring

## Integration Flow

1. User initiates a search from the 5 Ducks platform
2. 5 Ducks sends the search request to the N8N workflow via API
3. N8N processes the search query through configured workflows
4. N8N sends results back to 5 Ducks via a webhook
5. 5 Ducks processes and stores the results

## Implementation Details

### Sending Search Requests

Search requests are sent to N8N using the `sendSearchRequest` function in `server/lib/workflow-service.ts`. This function:

- Generates a unique search ID
- Logs the outgoing request
- Sends the request to the N8N workflow webhook URL
- Starts a keep-alive mechanism for long-running searches

Example request payload:

```json
{
  "query": "software companies in Boston",
  "searchId": "search_1682501234567",
  "callbackUrl": "https://your-app-domain.com/api/webhooks/search-results",
  "userId": 123,
  "strategyId": 456,
  "strategyName": "Company Overview",
  "strategyConfig": { ... }
}
```

### Receiving Results

Results are received through the webhook endpoint defined in `server/routes.ts`. This endpoint:

- Logs the incoming webhook data
- Processes company and contact results
- Stores the data in the database
- Stops the keep-alive mechanism

Example response payload:

```json
{
  "searchId": "search_1682501234567",
  "status": "completed",
  "results": {
    "companies": [
      {
        "name": "Example Tech",
        "website": "https://example-tech.com",
        "industry": "Software Development",
        "location": "Boston, MA",
        "size": "50-100 employees",
        "foundedYear": 2015
      }
    ],
    "contacts": [
      {
        "name": "Jane Smith",
        "title": "CEO",
        "email": "jane@example-tech.com",
        "linkedin": "https://linkedin.com/in/janesmith",
        "phone": "+1-555-123-4567"
      }
    ]
  }
}
```

### Webhook Logging

All webhook communications are logged in the `webhook_logs` table, with functions defined in `server/lib/webhook-logger.ts`. This includes:

- Outgoing search requests
- Incoming webhook data
- HTTP status codes
- Processing details

The system also provides health monitoring through the `checkN8NHealth` function.

## Keep-Alive Mechanism

For long-running searches, a keep-alive mechanism is implemented to ensure the server stays responsive. This is handled by the `startKeepAlive` and `stopKeepAlive` functions in `workflow-service.ts`.

## Configuration

The N8N workflow webhook URL is set in the environment variable `N8N_WEBHOOK_URL`. In development, you can set this in your `.env` file:

```
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/endpoint
N8N_API_KEY=your_api_key_here
```

## Creating and Configuring N8N Workflows

1. Set up your N8N instance
2. Create a new workflow with a webhook trigger
3. Configure the workflow to process search queries
4. Add an HTTP request node to send results back to 5 Ducks
5. Set the webhook URL in the 5 Ducks environment