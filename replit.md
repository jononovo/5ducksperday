# 5Ducks B2B Prospecting Application

## Overview

5Ducks is a comprehensive B2B lead generation and prospecting platform designed to help small businesses "sell to 5 new people every day." The application combines AI-powered company search, contact discovery, email enrichment, and campaign management into a unified platform. Built with React frontend and Express/Node.js backend, it uses Replit Database for data persistence and integrates with multiple third-party APIs for contact discovery and validation.

## System Architecture

### Frontend Architecture
- **React SPA** with TypeScript for type safety
- **Vite** for development and build tooling
- **Tailwind CSS** with shadcn/ui component library for styling
- **TanStack Query** for server state management
- **React Router** for client-side routing
- **Radix UI** components for accessible UI primitives

### Backend Architecture
- **Express.js** server with TypeScript
- **Replit Database** for data persistence with simple key-value operations
- **Passport.js** for authentication with Firebase Auth integration
- **Modular API design** with separate route handlers and business logic

### Database Design
- **Replit Database** for simple key-value data storage
- **Schema validation** using Zod for data integrity
- **Storage abstraction layer** with IStorage interface for consistent data operations

## Key Components

### Search & Discovery System
- **Multi-stage search process**: Company discovery → Contact extraction → Email enrichment
- **AI-powered analysis** using Perplexity API for company intelligence
- **Modular search architecture** with pluggable search modules
- **Enhanced search orchestrator** with retry logic and error handling
- **Real-time search status tracking** with webhook integration

### Contact Management
- **Intelligent contact discovery** with confidence scoring
- **Email validation and enrichment** through multiple providers (Hunter.io, Apollo.io, AeroLeads)
- **Contact ranking system** based on role importance and validation scores
- **Post-search enrichment queue** for background processing

### Email & Campaign System
- **Template-based email campaigns** with personalization
- **Multi-provider email integration** (Gmail, mock providers)
- **Thread-based conversation tracking**
- **Campaign performance analytics**

### Authentication & User Management
- **Firebase Authentication** for secure user login
- **Session-based authentication** with Passport.js
- **User preferences and settings management**
- **Multi-tenant architecture** with user isolation

## Data Flow

### Primary Search Flow
1. **User Input**: Search query entered on landing or main application page
2. **Company Discovery**: Perplexity API searches for matching companies
3. **Company Analysis**: Each company analyzed for size, services, and market position
4. **Contact Extraction**: AI extracts key decision makers from company information
5. **Email Discovery**: Multiple APIs (Hunter, Apollo, AeroLeads) search for contact emails
6. **Validation & Scoring**: Contacts validated and scored for relevance
7. **Results Display**: Companies displayed in expandable table with top 3 contacts each

### Background Processing
- **Post-search enrichment queue** processes additional contact validation
- **Search session management** maintains state across long-running searches

## External Dependencies

### Core APIs
- **Perplexity API**: Company research and contact discovery
- **OpenAI API**: Email strategy generation and content creation
- **Hunter.io API**: Email finder and verification
- **Apollo.io API**: Professional contact database
- **AeroLeads API**: Email discovery service

### Infrastructure
- **Firebase**: Authentication and user management
- **Replit Key-value Database**: Primary data storage
- **Google APIs**: Gmail integration for email campaigns

### Development Tools
- **Vite**: Frontend build tool and dev server
- **ESBuild**: Backend bundling for production

## Deployment Strategy

### Development Environment
- **Replit-optimized**: Configured for Replit's development environment
- **Hot reloading**: Vite provides instant frontend updates
- **Database provisioning**: Automatic Replit Database setup
- **Port configuration**: Frontend (3000) and backend (5000) ports configured

### Production Deployment
- **Google Cloud Run**: Containerized deployment target
- **Build process**: Vite builds static assets, ESBuild bundles backend
- **Environment variables**: Replit Database access and API keys via environment

### Storage Strategy
- **Currently only using the Key-value DB**: Although there is a switcher for when we want to move over to PostgreSQL


## Deployment Configuration

### Environment Variables
- **Required**: `OPENAI_API_KEY`, `APOLLO_API_KEY` 
- **Optional**: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`
- **Auto-configured**: `DATABASE_URL` (Replit Database), Firebase keys

### Port Configuration
- Development: Port 5000 on localhost
- Production: Uses PORT environment variable, binds to 0.0.0.0 for Cloud Run compatibility

### Stripe Integration
- Payment features gracefully degrade when Stripe keys are missing
- Application continues to function without payment capabilities
- Webhook verification is optional (fallback to unverified processing)

## Changelog

### Recent Changes (Last 10 Commits)

- July 10, 2025. **Plan Name Rebranding Implementation**: Updated subscription plan names from "The Ugly Duckling" to "The Duckling" and "Duckin' Awesome" to "Mama Duck" across entire application. Updated credit upgrade dropdown component, account billing section, subscription status mappings, email templates, and all user-facing text. Maintained backend plan IDs (`ugly-duckling`, `duckin-awesome`) for database and Stripe consistency while updating all display names.

- July 10, 2025. **Account Page Billing Section Downgrade Logic**: Changed "Upgrade to The Ugly Duckling" button to "Downgrade to Ugly Duckling" reflecting that this is likely a downgrade action for users on higher plans. Updated email generation logic to properly handle downgrade requests with appropriate subject lines and body content. Enhanced email template system to differentiate between upgrade, downgrade, and cancellation actions for more accurate support communication.

- July 9, 2025. **Landing Page Statistics Layout Fix**: Fixed layout issue where three statistics components (~48 Mins, 225 Targets, Avg $70k) were stacking vertically on wider screens instead of staying in a row. Changed `flex-wrap` to `flex-nowrap` on statistics container to force horizontal alignment across all screen sizes. Added `md:whitespace-nowrap` to statistic text divs to prevent text wrapping within each component on wider screens while allowing natural wrapping on mobile.

- July 9, 2025. **Landing Page Copy Updates**: Updated landing page hero message from "Then sell to them everyday. ⚡" to "Find companies, contacts & their emails with a prompt 🎯" for cleaner, more focused messaging that emphasizes the core value proposition. Also updated search input placeholder from "Adventure service providers in Maine" to "Extreme adventure companies in Maine" for more specific targeting.

- July 9, 2025. **Gmail Email Address Display**: Implemented comprehensive Gmail email address display feature. Added gmailEmail and gmailName fields to UserTokens interface, enhanced OAuth callback to fetch Gmail profile data via Gmail API, updated TokenService to store user info, created /api/gmail/user endpoint, and modified frontend to display actual email address instead of "Gmail Connected" badge. Email addresses are truncated to 20 characters with ellipsis for long addresses, with graceful fallback to "Gmail Connected" if user info is unavailable.

- July 9, 2025. **Google Auth Button Cleanup**: Removed "Google Auth Coming Soon" hover message and "Gmail permissions required" text from both registration and login pages. Increased bottom margin for better spacing between Google Sign-in button and "Already have an account? Sign In" text. Google authentication button now appears clean and professional without explanatory overlays.

- July 9, 2025. **Interactive Demo Video Implementation**: Replaced placeholder video section in landing page with real Arcade demo embed. Removed old JavaScript video expansion logic and implemented responsive Arcade iframe that automatically handles mobile/desktop display. Demo now shows actual 5Ducks platform walkthrough with native interaction handling.

- July 8, 2025. **Gmail OAuth Popup Authentication Fix**: Fixed "Authentication required" error when connecting Gmail accounts. Popup windows don't inherit session cookies, so modified OAuth flow to use URL-based user identification instead of session-based authentication. Frontend now passes user ID parameter, backend validates user existence directly. Gmail OAuth now works in both development and production environments.

- July 8, 2025. **Production Crash Fix**: Reverted extensive debug logging that caused complete production server failure. Restored minimal Gmail OAuth implementation with universal protocol detection only. Production server now stable and functional.

- July 8, 2025. **Gmail API Integration Universal Protocol Fix**: Implemented universal protocol detection for Gmail OAuth that works with any domain. Uses environment variable `OAUTH_PROTOCOL` if set, defaults to HTTPS in production, and falls back to request protocol in development. This replaces domain-specific logic and ensures Gmail OAuth works regardless of hosting platform (Replit, custom domains, load balancers, etc.).

### Historical Summary (Weekly)

**Week of July 1-7, 2025: Gmail OAuth Integration & Authentication**
- Implemented comprehensive Gmail OAuth integration with dual authentication (Firebase + Gmail API)
- Added Gmail connection status checking and email address display
- Fixed popup authentication issues and universal protocol detection
- Created account management system with profile editing capabilities

**Week of June 24-30, 2025: Production Deployment & Stability**
- Configured proper port binding for Cloud Run (0.0.0.0)
- Made Stripe environment variables optional to prevent startup crashes
- Added graceful degradation for missing payment service configuration
- Implemented landing page NYC branding and hero copy optimization

**Week of June 13-23, 2025: Template System & Merge Fields**
- Created comprehensive template management system with edit/save functionality
- Implemented merge field system with 13 variables and clipboard integration
- Added template confirmation dialogs and edit mode switching
- Developed dual storage system for merge field conversion

**Week of June 13-20, 2025: Mobile UI Revolution**
- Completed mobile-first design transformation across entire application
- Implemented Gmail-style edge-to-edge mobile input layout
- Added responsive button standardization and hover animations
- Created mobile navigation spacing optimization and contact chips system

