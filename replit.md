# 5Ducks B2B Prospecting Application

## Overview
5Ducks is a comprehensive B2B lead generation and prospecting platform designed to help small businesses acquire new leads daily. It offers AI-powered company search, contact discovery, email enrichment, and campaign management, streamlining the prospecting process and providing a competitive edge in B2B sales. The project's vision is to deliver a unified, efficient solution for lead generation.

## User Preferences
Preferred communication style: Simple, everyday language.
Mobile UI preference: Compact, space-efficient design with seamless header-to-content transitions.

## System Architecture
The application features a **React SPA frontend** built with TypeScript, Vite, Tailwind CSS (using shadcn/ui), TanStack Query, React Router, and Radix UI. The **backend** is developed with Express.js and TypeScript.

**Key Architectural Decisions:**
- **Modular API Design:** Distinct route handlers and business logic ensure maintainability. Feature-based folder structure with self-contained modules (e.g., server/features/gmail-integration, server/features/health-monitoring, server/features/lists) following the email-content-generation pattern. Ongoing modularization reducing routes.ts from 4961 to 4275 lines (14% reduction).
- **Hybrid Storage Architecture:** PostgreSQL is used for structured data (users, lists, companies, contacts, email_templates, strategic_profiles), while Replit Key-Value Database handles volatile data (credits, Gmail tokens, subscriptions, notifications).
- **Multi-stage Search Process:** Orchestrates company discovery, contact extraction, and email enrichment using AI and external APIs.
- **Intelligent Contact Discovery:** Includes confidence scoring and email validation through multiple providers.
- **Template-based Email Campaigns:** Supports personalization and multi-provider email integration.
- **Authentication:** Firebase Authentication secures user login, complemented by session-based authentication via Passport.js.
- **UI/UX:** A consistent design language, utilizing Tailwind CSS and shadcn/ui, ensures a professional and unified aesthetic. Emphasis is placed on clear navigation, responsive design, and intuitive user flows. Color schemes prioritize blues, grays, and greens.
- **Search Orchestration:** An enhanced search orchestrator includes retry logic, error handling, and real-time status tracking via webhooks.
- **Email Generation System:** Features a sophisticated system providing 42 unique email combinations derived from 7 distinct tones and 6 offer strategies (Hormozi, Formula, 1-on-1, Guarantee, Shiny, Study). Email content generation is modularized for maintainability.
- **Email Content Handling:** Preserves paragraph spacing from AI responses in generated emails.
- **Product Offers Generation:** Complete 6-strategy offer generation system with proper routing fix (Aug 2025) that bypasses boundary API for "Generate product offers" input. Includes clean UX flow that hides generation button after successful completion.
- **Product Offers Display:** Product offers now display in the Implementation tab of strategy detail pages, positioned below Daily Search Queries with matching design patterns and copy functionality (Aug 2025).
- **Search State Persistence:** Enhanced search input field synchronization to properly maintain query consistency between typed input and executed searches across page refreshes, ensuring displayed results always match the shown query (Sep 2025).
- **Lists Management Module:** Extracted lists functionality into self-contained module (Sep 2025), reducing 198 lines from main routes.ts. Module handles list CRUD operations, company associations, and demo list visibility for unauthenticated users.

## External Dependencies
- **Perplexity API**: Company research and contact discovery.
- **OpenAI API**: Email strategy generation and content creation.
- **Hunter.io API**: Email finder and verification.
- **Apollo.io API**: Professional contact database.
- **AeroLeads API**: Email discovery service.
- **Firebase**: Authentication and user management.
- **Replit Key-value Database**: Primary data storage.
- **PostgreSQL**: Primary data storage.
- **Google APIs**: Gmail integration.