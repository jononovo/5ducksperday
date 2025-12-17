# 5Ducks B2B Prospecting Platform

## Overview
5Ducks is an AI-powered B2B lead generation platform designed to transform simple queries into comprehensive prospect lists. It offers verified contacts, personalized outreach campaigns, and automated email campaign management with intelligent scheduling and spam prevention. The platform aims to streamline lead generation, enhance outreach effectiveness, and scale business development efforts.

## User Preferences
- **Default Email Tone**: Professional with personalized intros
- **Campaign Defaults**: Batch size 10, daily limit 50
- **UI Preferences**: Dark mode support, mobile-first responsive design
- **Navigation Flow**: Search → Save List → Create Campaign → Launch

## System Architecture
The platform is built with a React SPA frontend (TypeScript, Vite, Tailwind, shadcn/ui, TanStack Query) and an Express.js backend (TypeScript) utilizing PostgreSQL for core data and Replit KV Store for dynamic configurations. Authentication is handled by Firebase and Passport.js.

**UI/UX Decisions:**
- **Historic Searches Drawer**: Moved to a permanent header position for accessibility.
- **Mobile Optimization**: Designed with an 80% drawer width and tap-outside-to-close functionality for better mobile experience.
- **Improved Navigation**: Employs event-based communication between components for a smoother user experience.
- **Better Table Layout**: Optimized column spacing for search results.

**Technical Implementations:**
- **Search System**: Features a progressive pipeline for companies, contacts, and emails, coordinated by `SearchOrchestrator` and processed asynchronously by `JobProcessor`.
- **Contact Discovery**: Utilizes a multi-stage fallback with validation scoring via `ContactSearchService` and `findKeyDecisionMakers()`.
- **Email Enrichment**: Employs a tiered provider approach (`parallelTieredEmailSearch`) integrating Apollo, Perplexity+Hunter, and AeroLeads.
- **Email Campaign System**: Provides comprehensive outreach management with custom email creation, merge fields, quick templates, and AI-powered generation. It supports both **Human Review Mode** (default, requiring approval before sending) and **Auto-Send Mode** (template-based automatic sending). An `Autopilot Modal` enables automated scheduling with intelligent spacing and rate limiting.
- **Individual Search**: Implemented via a structured modal input, leveraging Perplexity Search API and Claude for precise extraction and scoring of candidates.
- **OAuth Token Storage**: Gmail OAuth tokens are stored exclusively in an encrypted `oauth_tokens` table in PostgreSQL using AES-256-CBC.
- **Drip Email Engine**: Centralized system email scheduler at `server/email/` for template-based transactional emails (access confirmations, welcome sequences, registration welcome emails). Features 5-minute polling, working-day calculations, and sequence enrollment. Uses SendGrid for delivery. Includes `sendImmediate()` method for non-blocking immediate email sends (used for registration welcome emails).

**Email System Architecture (Two Separate Systems):**
- **Drip Engine** (`server/email/`): System-to-user transactional emails via SendGrid. Template-based, scheduled sequences (e.g., access code drip campaigns). Tables: `email_sequences`, `email_sequence_events`, `email_sends`.
- **Daily Outreach** (`server/features/daily-outreach/`): User-to-prospect prospecting emails via Gmail OAuth. AI-generated personalized content, per-user scheduling, autopilot windows. Tables: `daily_outreach_jobs`, `daily_outreach_batches`, `daily_outreach_items`.
- These systems are intentionally separate due to different delivery channels (SendGrid vs Gmail), content generation (templates vs AI), and compliance requirements (system notifications vs marketing outreach).

**Credit Reward & Progress Tracking System:**
- **Unified Progress Table**: `user_progress` stores all progress across features using namespace scoping (e.g., `form`, `challenge`, `easter-egg`). Fields: `userId`, `namespace`, `completedMilestones` (string array), `metadata` (JSON).
- **Unified Service**: `CreditRewardService` (`server/features/billing/rewards/service.ts`) provides `awardOneTimeCredits()` for all credit rewards across features.
- **Progress Routes**: Generic endpoints at `/api/progress/:namespace` (GET/PATCH) and `/api/progress/:namespace/milestone/:milestoneId` (POST) handle any namespace with automatic milestone diffing and credit awarding.
- **Idempotency**: Uses `rewardKey` column in `credit_transactions` with unique index on (user_id, reward_key) to prevent duplicate claims.
- **RewardKey Format**: `"namespace:milestoneId"` (e.g., `"registration:welcome-bonus"`, `"challenge:basic-company-contact-search"`, `"form:onboarding-section-a"`, `"easter-egg:5ducks"`).
- **Registration Credits**: 250 credits awarded immediately at user creation (all 3 paths: Firebase auth, email/password, Google OAuth) using rewardKey `"registration:welcome-bonus"`. No lazy initialization.
- **Namespace Configs**: Defined in `server/features/progress/routes.ts` with milestone-specific credits. Unknown namespaces fall back to 50 credits.
- **Onboarding Credits**: Section A=50, Section B=75, Section C=100, Section D=120 credits (total 345, stacks on top of registration 250 = 595).
- **Challenge Credits**: 110 credits per completed challenge (configurable via `completionCredits` field). Credits awarded server-side when guidance progress is saved.
- **Storage Helper**: `storage.awardOneTimeCredits()` uses database transaction with conflict detection for race-safe credit attribution.
- **Demo User Exclusion**: User id=1 (demo user) is excluded from progress saving and credit operations (enforced in CreditRewardService).

**System Design Choices:**
- **Data Architecture**: PostgreSQL serves as the primary database for core entities (users, companies, contacts, campaigns) and analytics. Replit KV stores credits, tokens, subscriptions, and rate limiting data. A database-persistent job queue with retry logic manages background tasks.
- **List ID Naming Convention**: Clarification provided for `lists.id` (DB primary key) and `lists.list_id` (user-facing display number), with a future plan to rename `lists.list_id` to `lists.display_id`.
- **Authentication**: Firebase handles authentication, with Passport.js for session management. `requireAuth` middleware protects routes.
- **Concurrency & Rate Limits**:
    - Max 7 companies processed simultaneously.
    - Max 10 parallel email sends.
    - 10 searches/hour for demo users.
    - 500 emails/day maximum per campaign with a 30s minimum spacing.
- **Modular Code Architecture**: Features are organized using a module pattern (`server/features/[name]` and `client/src/features/[name]`) for improved maintainability and reusability.

## External Dependencies
- **Perplexity**: Used for company and contact discovery.
- **Hunter.io**: Integrated for email verification.
- **Apollo.io**: Utilized for contact database lookups.
- **OpenAI**: Powers AI-driven email content generation based on tone and strategy.
- **SendGrid**: Handles email delivery and tracking, including webhook management.
- **Firebase**: Provides authentication services.
- **PostgreSQL**: The primary relational database for persistent data storage.
- **Replit KV Store**: Used for storing key-value pairs such as credits, tokens, and rate limits.