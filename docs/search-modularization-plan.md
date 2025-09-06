# Search Modularization Plan

## Overview
This document outlines the comprehensive plan to modularize the search functionality in the 5Ducks B2B prospecting application, extracting ~2000 lines of search-related code from `server/routes.ts` into organized, maintainable modules.

## Current State Analysis
The search functionality currently spans **~2000+ lines** in `server/routes.ts` with the following components:
- **Company Search**: Lines 879-1325 (quick-search, full search with caching)
- **Contact Discovery**: Lines 1326-1759 (contact extraction from companies)
- **Email Enrichment**: Lines 1642-2819 (Perplexity, Hunter, Apollo, AeroLeads)
- **Orchestration**: Lines 1820-2159 (find-all-emails workflow)
- **Session Management**: Lines 264-661 (search session tracking)

## Proposed Module Structure
```
server/search/
├── companies.ts        # Company search logic (~450 lines)
├── contacts.ts         # Contact discovery/enrichment (~400 lines)
├── emails.ts           # Email enrichment orchestration (~350 lines)
├── orchestrator.ts     # Multi-stage search coordination (~300 lines)
├── sessions.ts         # Search session management (~200 lines)
├── providers/          # Email provider implementations
│   ├── hunter.ts       # Hunter.io integration (~150 lines)
│   ├── apollo.ts       # Apollo.io integration (~150 lines)
│   ├── aeroleads.ts    # AeroLeads integration (~150 lines)
│   └── perplexity.ts   # Perplexity email search (~100 lines)
├── types.ts            # Shared types for search module
└── index.ts            # Main exports and route registration
```

## Implementation Instructions

### Phase 1: Create Base Structure and Types
**File: `server/search/types.ts`**
```typescript
// Extract and consolidate these types from routes.ts:
- SearchSessionResult (lines 43-54)
- Contact search configurations
- Email enrichment responses
- Company search responses
- Import existing types from @shared/schema
```

### Phase 2: Extract Company Search
**File: `server/search/companies.ts`**

Move these endpoints and their logic:
- `POST /api/companies/quick-search` (lines 879-1015)
- `POST /api/companies/search` (lines 1018-1325)
- `GET /api/companies` (lines 822-835)
- `GET /api/companies/:id` (lines 837-877)

Dependencies to import:
- `searchCompanies` from `server/lib/search-logic`
- `CreditService` from `server/lib/credits`
- Storage operations
- Cache management logic (global.searchCache)

### Phase 3: Extract Contact Discovery
**File: `server/search/contacts.ts`**

Move these endpoints:
- `GET /api/companies/:companyId/contacts` (lines 1326-1351)
- `POST /api/companies/:companyId/enrich-contacts` (lines 1352-1482)
- `POST /api/contacts/search` (lines 1731-1758)
- `GET /api/contacts/:id` (lines 1483-1511)
- `POST /api/contacts/:contactId/enrich` (lines 1642-1729)

Dependencies:
- `extractContacts` from `server/lib/perplexity`
- `findKeyDecisionMakers` from `server/lib/search-logic/contact-discovery/enhanced-contact-finder`
- `searchContactDetails` from `server/lib/api-interactions`

### Phase 4: Extract Email Providers
**File: `server/search/providers/hunter.ts`**

Move endpoint logic from:
- `POST /api/contacts/:contactId/hunter` (lines 2507-2607)
- Import `EnhancedSearchOrchestrator` from `server/lib/search-logic/email-discovery/enhanced-search-orchestrator`

**File: `server/search/providers/apollo.ts`**

Move endpoint logic from:
- `POST /api/contacts/:contactId/apollo` (lines 2610-2709)

**File: `server/search/providers/aeroleads.ts`**

Move endpoint logic from:
- `POST /api/contacts/:contactId/aeroleads` (lines 2712-2819)

**File: `server/search/providers/perplexity.ts`**

Extract Perplexity-specific email search logic from contact enrichment endpoint

### Phase 5: Extract Email Orchestration
**File: `server/search/emails.ts`**

Consolidate email search coordination:
- Main email enrichment logic
- Provider selection logic
- Email deduplication (`mergeEmailData` from `server/lib/email-utils`)
- Credit checking for email searches

### Phase 6: Extract Orchestrator
**File: `server/search/orchestrator.ts`**

Move the complex multi-stage search:
- `POST /api/companies/find-all-emails` (lines 1820-2159)
- Waterfall search logic
- Parallel processing with delays
- Session status updates

### Phase 7: Extract Session Management
**File: `server/search/sessions.ts`**

Move session-related endpoints:
- `GET /api/search-sessions/:sessionId/status` (lines 264-311, 661-785)
- `DELETE /api/search-sessions/:sessionId` (lines 312-345)
- `DELETE /api/search-sessions` (lines 346-378)
- Global session storage management

### Phase 8: Create Main Index
**File: `server/search/index.ts`**
```typescript
export function registerSearchRoutes(app: Express, requireAuth: any) {
  // Register all search-related routes
  registerCompanyRoutes(app, requireAuth);
  registerContactRoutes(app, requireAuth);
  registerEmailRoutes(app, requireAuth);
  registerOrchestratorRoutes(app, requireAuth);
  registerSessionRoutes(app);
}
```

## Key Considerations for Implementation

### 1. Maintain Exact API Compatibility
- All endpoints must keep the same paths and response formats
- Preserve all query parameters and body structures

### 2. Preserve Business Logic
- Credit deduction logic (20 credits for individual, 50 for batch)
- Cache TTL settings (quick search: 5 minutes, full search: 30 minutes)
- getUserId helper function behavior (fallback to demo user ID 1)

### 3. Handle Dependencies
- Import statements need updating
- Shared utilities like `getUserId` should be extracted to a common location
- Database storage interface must be accessible from all modules

### 4. Testing Points
- Quick search returns 7 companies max
- Full search enriches with contacts based on configuration
- Email search respects completed searches array
- Sessions properly track multi-stage search progress

## Expected Outcome
- Reduce `server/routes.ts` by **~2000 lines** (48% reduction from current 4155 lines)
- Create focused, maintainable modules
- Improve code organization and testability
- Maintain 100% backward compatibility

## Migration Checklist
- [ ] Create folder structure
- [ ] Extract types and interfaces
- [ ] Move company search endpoints
- [ ] Move contact discovery endpoints
- [ ] Extract email provider integrations
- [ ] Consolidate email orchestration
- [ ] Move session management
- [ ] Update imports in routes.ts
- [ ] Test all endpoints maintain functionality
- [ ] Update replit.md documentation

## Notes
This modularization aligns with the existing pattern established with email-templates and lists modules, creating a consistent architecture across the codebase.

## Search Flow Documentation

### 1. Company Search Flow
The company search operates in two modes:
- **Quick Search**: Returns basic company data with 5-minute cache
- **Full Search**: Enriches companies with contacts, 30-minute cache

### 2. Contact Discovery Flow
Contacts are discovered through multiple stages:
1. Initial extraction from company data
2. Key decision maker identification
3. Contact enrichment with details

### 3. Email Enrichment Flow
Email discovery uses a waterfall approach across providers:
1. Apollo.io (highest accuracy)
2. Perplexity (AI-based discovery)
3. Hunter.io (domain-based search)
4. AeroLeads (fallback option)

### 4. Orchestration Flow
The multi-stage search orchestrator coordinates:
1. Company discovery
2. Contact extraction (top 3 per company)
3. Email enrichment (parallel with delays)
4. Session status tracking