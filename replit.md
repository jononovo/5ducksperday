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