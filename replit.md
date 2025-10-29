# 5Ducks B2B Prospecting Platform

## Overview
AI-powered B2B lead generation platform that transforms simple queries into comprehensive prospect lists with verified contacts and personalized outreach campaigns. Features automated email campaign management with intelligent scheduling and spam prevention.

## Tech Stack
- **Frontend**: React SPA (TypeScript, Vite, Tailwind + shadcn/ui, TanStack Query)
- **Backend**: Express.js (TypeScript), PostgreSQL, Replit KV Store
- **Auth**: Firebase + Passport.js session management
- **Email**: SendGrid for delivery, OpenAI for content generation

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
- **Historic Searches**: Drawer UI in header for quick access to saved searches

### 📧 Email Enrichment
Tiered provider approach: Apollo → Perplexity+Hunter → AeroLeads
- `parallelTieredEmailSearch()` - Main enrichment pipeline
- `EmailDiscoveryService` - Coordinates providers
- **Providers**: `searchApollo()`, `searchHunter()`, `searchPerplexity()`

### ✉️ Email Campaign System
Comprehensive outreach management with AI-powered personalization
- **Email Composer**: (`client/src/components/email-composer.tsx`)
  - Custom email creation with merge fields ({firstName}, {companyName}, etc.)
  - Quick templates for common scenarios (Cold Outreach, Partnership, etc.)
  - AI-powered email generation with tone and strategy selection
- **Campaign Settings**: (`client/src/components/campaign-settings.tsx`)
  - Batch size configuration (5-50 contacts)
  - Daily sending limits with spam prevention
  - Time zone aware scheduling
- **Autopilot Modal**: (`client/src/components/autopilot-modal.tsx`)
  - Automated campaign scheduling with day/time selection
  - Intelligent email spacing (minimum 30s between sends)
  - Rate limiting to prevent spam detection
- **Email Generation Service**: (`server/email-content-generation/service.ts`)
  - 42 unique combinations (7 tones × 6 strategies)
  - Context-aware personalization using company/contact data
  - Template storage and reuse system

### 🎯 Campaign Management
Daily automated outreach with scheduling controls
- `batchGenerator.generateDailyBatch()` - Creates daily prospects
- `EmailStrategyService` - AI-powered content generation
- `sendGridService.sendDailyNudgeEmail()` - Email delivery with tracking
- **Endpoints**: 
  - `/streak` - Campaign dashboard and configuration
  - `/api/campaigns` - Campaign CRUD operations
  - `/api/email-templates` - Template management

### 💾 Data Architecture
- **PostgreSQL**: 
  - Core tables: `users`, `companies`, `contacts`, `lists`, `search_jobs`
  - Campaign tables: `campaigns`, `email_templates`, `campaign_recipients`
  - Analytics: `email_tracking`, `campaign_metrics`
- **Replit KV**: Credits, tokens, subscriptions, notifications, rate limiting
- **Job Queue**: Database-persistent with retry logic (max 3 attempts)

### 🔐 Authentication
- Firebase for auth, Passport for sessions
- `requireAuth` middleware - Protected routes
- `ENABLE_AI_TEST_MODE` - Testing bypass (demo user ID 1)

## Recent Updates (October 2025)

### Code Architecture & Refactoring (October 29, 2025)
- **Email Drawer Feature Extraction**: Modularized email drawer from home.tsx
  - Created `client/src/features/email-drawer/` with 4 files (types, hook, component, exports)
  - Reduced home.tsx from 3,324 to 3,053 lines (~271 line reduction)
  - Improved maintainability and reusability across the application
  - Zero functionality regression - all drawer features preserved
- **Top Prospects Card Extraction**: Modularized prospects table from home.tsx
  - Created `client/src/features/top-prospects/` with 3 files (types, component, exports)
  - Further reduced home.tsx from 3,053 to 2,879 lines (~176 line reduction)
  - Maintains all functionality: table rendering, selection, enrichment, feedback
- **Search State Management Extraction**: Modularized search persistence logic
  - Created `client/src/features/search-state/` with 3 files (types, hook, exports)
  - `useSearchState` hook manages localStorage/sessionStorage persistence
  - Database refresh logic for navigation persistence (restores contact emails)
  - Type-safe with shared `CompanyWithContacts` extending canonical `Company` from schema
  - Further reduced home.tsx from 2,879 to 2,688 lines (~191 line reduction)
  - **Total reduction: home.tsx down from 3,324 to 2,688 lines (636 lines removed, 19.1% reduction)**

### Campaign & Email Features
- **Email Campaign System**: Full campaign management with templates and merge fields
- **Autopilot Scheduling**: Automated sending with intelligent spacing
- **Quick Templates**: Pre-built templates for common outreach scenarios
- **AI Email Generation**: Context-aware content with multiple tones/strategies

### UI/UX Improvements
- **Historic Searches Drawer**: Moved from floating to permanent header position
- **Mobile Optimization**: 80% drawer width, tap-outside-to-close
- **Improved Navigation**: Event-based communication between components
- **Better Table Layout**: Optimized column spacing for search results

### Technical Enhancements
- **"+5 More" Extension**: `ExtensionSearchService` with duplicate prevention
- **Search Tests**: Comprehensive test suite in `TestRunner.testSearchExtensionFeature()`
- **Race Condition Fix**: List creation debouncing (1.5s) prevents duplicates
- **Email Rate Limiting**: Prevents spam detection with configurable delays

## API Integrations
- **Perplexity**: Company/contact discovery (`discoverCompanies()`, `enrichCompanyDetails()`)
- **Hunter.io**: Email verification (`searchHunterDirect()`)
- **Apollo.io**: Contact database (`searchApolloDirect()`)
- **OpenAI**: Email generation (`generateEmailStrategy()`, `generateEmailContent()`)
- **SendGrid**: Email delivery with tracking (`sg.send()`, webhook handling)

## Key Configuration
```bash
# Essential environment variables
PERPLEXITY_API_KEY, HUNTER_API_KEY, APOLLO_API_KEY
DATABASE_URL, FIREBASE_CONFIG
SENDGRID_API_KEY, SENDGRID_FROM_EMAIL
OPENAI_API_KEY # For email content generation
```

## Development Guidelines
- **Module Pattern**: Features in `server/features/[name]` + `client/src/features/[name]`
- **Rate Limits**: 
  - 10 searches/hour for demo users
  - 500 emails/day maximum per campaign
  - 30s minimum spacing between campaign emails
- **Concurrency**: 
  - Max 7 companies processed simultaneously
  - Max 10 parallel email sends
- **Testing**: 
  - Run via `/admin` UI 
  - Search tests: `npx tsx server/test-search-extension.ts`
  - Email tests: `npx tsx server/test-email-generation.ts`

## User Preferences & Workflow
- **Default Email Tone**: Professional with personalized intros
- **Campaign Defaults**: Batch size 10, daily limit 50
- **UI Preferences**: Dark mode support, mobile-first responsive design
- **Navigation Flow**: Search → Save List → Create Campaign → Launch