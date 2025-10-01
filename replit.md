# 5Ducks B2B Prospecting Platform

## Overview
AI-powered B2B lead generation platform that transforms simple queries into comprehensive prospect lists with verified contacts and personalized outreach campaigns.

## Tech Stack
- **Frontend**: React SPA (TypeScript, Vite, Tailwind + shadcn/ui, TanStack Query)
- **Backend**: Express.js (TypeScript), PostgreSQL, Replit KV Store
- **Auth**: Firebase + Passport.js session management

## Core Features & Technical Entry Points

### 🔍 Search System
**Progressive pipeline**: Companies (2-3s) → Contacts (5-10s) → Emails (10-20s)
- `SearchOrchestrator` - Main coordinator (`server/search/orchestrator/`)
- `SearchJobService.createJob()` - Async job creation
- `JobProcessor.processNextJob()` - Background processing (5s interval)
- `ExtensionSearchService.extendSearch()` - "+5 More" feature
- **Key endpoints**: `/api/companies/search`, `/api/search-jobs`, `/api/search/extend`

### 📊 Contact Discovery
Multi-stage fallback with validation scoring
- `findKeyDecisionMakers()` - Core discovery function (`server/search/contacts/finder.ts`)
- `ContactSearchService` - Orchestrates all contact searches
- `validateContact()` - Scoring and deduplication

### 📧 Email Enrichment
Tiered provider approach: Apollo → Perplexity+Hunter → AeroLeads
- `parallelTieredEmailSearch()` - Main enrichment pipeline
- `EmailDiscoveryService` - Coordinates providers
- **Providers**: `searchApollo()`, `searchHunter()`, `searchPerplexity()`

### 🎯 Campaign System
Daily automated outreach with AI personalization
- `batchGenerator.generateDailyBatch()` - Creates daily prospects
- `EmailStrategyService` - 42 unique email combinations (7 tones × 6 strategies)
- `sendGridService.sendDailyNudgeEmail()` - Email delivery
- **Endpoint**: `/streak` - Campaign management UI

### 💾 Data Architecture
- **PostgreSQL**: `users`, `companies`, `contacts`, `lists`, `search_jobs`, `email_templates`
- **Replit KV**: Credits, tokens, subscriptions, notifications
- **Job Queue**: Database-persistent with retry logic (max 3 attempts)

### 🔐 Authentication
- Firebase for auth, Passport for sessions
- `requireAuth` middleware - Protected routes
- `ENABLE_AI_TEST_MODE` - Testing bypass (demo user ID 1)

## Recent Updates (October 2025)
- **"+5 More" Extension**: `ExtensionSearchService` with duplicate prevention
- **Search Tests**: Comprehensive test suite in `TestRunner.testSearchExtensionFeature()`
- **Race Condition Fix**: List creation debouncing (1.5s) prevents duplicates

## API Integrations
- **Perplexity**: Company/contact discovery (`discoverCompanies()`, `enrichCompanyDetails()`)
- **Hunter.io**: Email verification (`searchHunterDirect()`)
- **Apollo.io**: Contact database (`searchApolloDirect()`)
- **OpenAI**: Email generation (`generateEmailStrategy()`)
- **SendGrid**: Email delivery (`sg.send()`)

## Key Configuration
```bash
# Essential environment variables
PERPLEXITY_API_KEY, HUNTER_API_KEY, APOLLO_API_KEY
DATABASE_URL, FIREBASE_CONFIG
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
```

## Development Guidelines
- **Module Pattern**: Features in `server/features/[name]` + `client/src/features/[name]`
- **Rate Limits**: 10 searches/hour for demo users
- **Concurrency**: Max 7 companies processed simultaneously
- **Testing**: Run via `/admin` UI or `npx tsx server/test-search-extension.ts`