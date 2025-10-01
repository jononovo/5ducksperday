# 5Ducks B2B Prospecting Application

## Overview
5Ducks is a comprehensive B2B lead generation and prospecting platform. Its purpose is to help small businesses acquire new leads daily by offering AI-powered company search, contact discovery, email enrichment, and campaign management. The platform aims to streamline the prospecting process, provide a competitive edge in B2B sales, and deliver a unified, efficient solution for lead generation.

## Recent Changes (October 1, 2025)
- **Fixed race condition in list creation**: Resolved issue where multiple different search queries were incorrectly saved to the same list ID. Solution captures values at timeout creation instead of relying on closure state.
- **Implemented "+5 More" feature**: Added ability to extend existing searches with 5 additional companies via backend endpoint `/api/search/extend` that excludes already-found companies.
- **Modularized Extension Search Architecture**: Separated "+5 More" extension logic from core search flow to prevent pollution and duplication issues:
  - Created dedicated `server/search/extensions/` module with ExtensionSearchService
  - Implemented client-side ExtendSearchButton component in `client/src/features/search-extension/`
  - Extension searches use dedicated 'extension' searchType for clean separation
  - Fixed console duplication and race conditions from improper state management

## User Preferences
Preferred communication style: Simple, everyday language.
Mobile UI preference: Compact, space-efficient design with seamless header-to-content transitions.

## System Architecture
The application features a **React SPA frontend** (TypeScript, Vite, Tailwind CSS with shadcn/ui, TanStack Query, React Router, Radix UI) and an **Express.js backend** (TypeScript).

**UI/UX Decisions:**
- Consistent design language with Tailwind CSS and shadcn/ui, prioritizing blues, grays, and greens.
- Emphasis on clear navigation, responsive design, and intuitive user flows.

**Technical Implementations & Feature Specifications:**
- **Modular API Design:** Feature-based folder structure for maintainability (e.g., `server/features/gmail-integration`, `server/search`, `server/campaigns`).
- **Search Module Architecture:** Dedicated `server/search` module with submodules for sessions, companies, contacts, providers (Hunter, Apollo, AeroLeads), orchestrator, and services.
- **Progressive Search System:** Optimized chained search (Companies → Contacts → Emails) with immediate company display, 7-company concurrent processing, smart contact fallback (if < 3 contacts found), and optimized API calls.
- **Resilient Search System:** Database-persistent job queue (`search_jobs` table) with asynchronous background processing, automatic retry logic, and priority-based execution.
- **Unified Contact Search:** All contact searches (browser-initiated and programmatic) go through a job queue system via `ContactSearchService`.
- **List Management Optimization:** Debounced updates (1.5s delay) and concurrency control prevent duplicate list creation and ensure consistent updates.
- **Template-based Email Campaigns:** Supports personalization and multi-provider email integration.
- **Authentication:** Firebase Authentication for user login, complemented by Passport.js for session management.
- **Email Generation System:** Sophisticated system offering 42 unique email combinations from 7 tones and 6 offer strategies, preserving paragraph spacing from AI responses.
- **Product Offers:** Generation system with 6 strategies, proper routing, and display in the Implementation tab with copy functionality.
- **Search State Persistence:** Synchronized search input fields maintain query consistency across page refreshes.
- **Modularization:** Key functionalities like Lists, Email Templates, User Account Settings, and Email Replies are extracted into self-contained modules.
- **Rate Limiting:** Session-based rate limiting for demo users (10 searches/hour) on quick-search and full search endpoints.
- **Streak Page & Campaign System:** Central hub for daily outreach campaigns with a 4-component campaign builder, adaptive banners, and automated daily batch generation of personalized prospects with AI-generated emails.
- **AI Testing Configuration:** `ENABLE_AI_TEST_MODE` secret allows authentication bypass for AI agents, operating as demo user ID 1 for testing purposes.

**System Design Choices:**
- **Hybrid Storage Architecture:** PostgreSQL for structured data (users, lists, companies, contacts, email_templates, strategic_profiles) and Replit Key-Value Database for volatile data (credits, Gmail tokens, subscriptions, notifications).
- **Modular Architecture Pattern:** New features follow a symmetric frontend-backend structure (`server/features/[feature-name]/` and `client/src/features/[feature-name]/`) with clear public APIs, internal organization, and shared types.

## External Dependencies
- **Perplexity API**: Company research and contact discovery.
- **OpenAI API**: Email strategy generation and content creation.
- **Hunter.io API**: Email finder and verification.
- **Apollo.io API**: Professional contact database.
- **Firebase**: Authentication and user management.
- **Replit Key-Value Database**: Volatile data storage.
- **PostgreSQL**: Structured data storage.
- **Google APIs**: Gmail integration.