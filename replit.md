# 5Ducks B2B Prospecting Application

## Overview
5Ducks is a comprehensive B2B lead generation and prospecting platform. Its core purpose is to help small businesses acquire new leads daily by providing AI-powered company search, contact discovery, email enrichment, and campaign management in a unified platform. The project aims to streamline the prospecting process, offering a competitive edge in B2B sales.

## User Preferences
Preferred communication style: Simple, everyday language.
Mobile UI preference: Compact, space-efficient design with seamless header-to-content transitions.

## System Architecture
The application features a **React SPA frontend** with TypeScript, Vite, Tailwind CSS (using shadcn/ui), TanStack Query, React Router, and Radix UI. The **backend** is built with Express.js and TypeScript, utilizing Replit Database for key-value data and Passport.js with Firebase Auth for authentication.

**Key Architectural Decisions:**
- **Modular API design** with distinct route handlers and business logic.
- **Hybrid Storage Architecture:** PostgreSQL is used for structured search data (users, lists, companies, contacts, email_templates, strategic_profiles). Replit Key-Value Database handles volatile data like credits, Gmail tokens, subscriptions, and notifications.
- **Multi-stage search process:** Company discovery, contact extraction, and email enrichment are orchestrated using AI and various external APIs.
- **Intelligent contact discovery** includes confidence scoring and email validation via multiple providers.
- **Template-based email campaigns** support personalization and multi-provider email integration.
- **Firebase Authentication** is used for secure user login, with session-based authentication via Passport.js.
- **UI/UX:** A consistent design language using Tailwind CSS and shadcn/ui ensures a professional, unified look across all pages. Emphasis is placed on clear navigation, responsive design, and intuitive user flows. Color schemes prioritize blues, grays, and greens for a professional and trustworthy appearance.
- **Search Orchestration:** Enhanced search orchestrator includes retry logic, error handling, and real-time status tracking via webhooks.

## External Dependencies
- **Perplexity API**: Company research and contact discovery.
- **OpenAI API**: Email strategy generation and content creation.
- **Hunter.io API**: Email finder and verification.
- **Apollo.io API**: Professional contact database.
- **AeroLeads API**: Email discovery service.
- **Firebase**: Authentication and user management.
- **Replit Key-value Database**: Primary data storage for specific data types.
- **PostgreSQL**: Primary data storage for structured search data.
- **Google APIs**: Gmail integration for email campaigns.