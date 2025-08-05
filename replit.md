# 5Ducks B2B Prospecting Application

## Overview
5Ducks is a comprehensive B2B lead generation and prospecting platform. Its core purpose is to help small businesses acquire new leads daily by providing AI-powered company search, contact discovery, email enrichment, and campaign management in a unified platform. The project aims to streamline the prospecting process, offering a competitive edge in B2B sales.

## User Preferences
Preferred communication style: Simple, everyday language.
Mobile UI preference: Compact, space-efficient design with seamless header-to-content transitions.

## Recent Changes
**August 5, 2025**: UI Polish - Gift Icon & Optional Clarity ✅ IMPLEMENTED
- Replaced TrendingUp icon with Gift icon for better visual representation of offers
- Enhanced popover description with "Optional:" prefix for immediate user clarity
- Improved visual consistency - Gift icon better represents offer/present concept than chart icon
- Maintains established UI pattern with clearer communication about feature optional nature
- Updated tone selector label from "BEAST MODE" to "BEAST" for cleaner presentation

**August 5, 2025**: Enhanced Offer Strategies with Framework Theory ✅ IMPLEMENTED
- Enhanced offer strategies with detailed frameworks, actionable structures, and fallback suggestions
- Framework theory stored for documentation/tooltips but NOT sent to AI (optimizes token usage)
- Each strategy now includes: theory framework (optional), actionable structure, fallback suggestions
- Hormozi strategy enhanced with specific value stacking formula and benefit suggestions
- Token-optimized prompts: only actionable instructions sent to AI, theory kept for user education
- Maintains 35 unique email combinations (7 tones × 5 strategies) with better specificity
- Modular architecture allows easy expansion and theory documentation without API overhead

**August 5, 2025**: Complete Offer Strategies System Implementation ✅ IMPLEMENTED
- Successfully implemented comprehensive offer strategies system alongside existing 7-tone system
- Created modular backend architecture: offer-configs, conditional processing, service integration
- Built sophisticated UI with dynamic button display: icon-only when 'none', icon+name when selected
- Integrated offer strategies with localStorage persistence and state management  
- 5 strategic offer approaches: Hormozi (benefit stacking), 1-on-1 (personal guidance), If we can't (guarantee-based), Shiny FREE (free resources), Case Study (social proof)
- System provides 7 tones × 5 offer strategies = 35 unique email combinations for maximum customization
- Zero disruption to existing workflow - offer selection is discoverable but non-intrusive
- Technical implementation affects email subject lines and middle sections while maintaining tone system for overall personality
- Follows established UI pattern: left=selection options, right=primary action (Generate Email button)

**August 5, 2025**: Complete Tone System Integration ✅ IMPLEMENTED
- Fixed frontend-backend tone integration gap identified by user feedback
- Added tone parameter to useEmailGeneration hook interface and payload construction
- Implemented professional Palette icon tone selector using lucide-react (replacing emoji)
- Created enhanced popover UI with clear visual hierarchy and better differentiation
- Implemented clickable button format showing selected tone name: [🎨 Default]
- Compact single-line format for tone descriptions to save space
- Removed blue left-border accent, keeping clean checkmark indicators for selection
- 7 tone options available: Silly, Friendly, Casual, Professional, Abrupt, BEAST MODE, Gen-Z
- Follows established UI pattern: left=options, right=primary action (Generate Email button)
- Added tone state persistence to localStorage with outreach form state
- Zero disruption to existing workflow - tone selection is discoverable but non-intrusive
- Completes sophisticated backend tone system with frontend user access

**August 5, 2025**: Email Context Clarity Enhancement ✅ TESTED
- Fixed AI company confusion by clarifying prompt context labels
- Changed "Company:" to "TARGET COMPANY:" and "Recipient:" to "TARGET CONTACT:" in email generation prompts
- Updated merge field descriptions to distinguish target vs sender context clearly
- Enhanced UI labels: "Contact's Company Name" → "Target Company Name" for better user clarity
- Zero breaking changes - all existing templates and workflows remain functional
- Eliminates AI incorrectly assuming sender works at target company
- **User Verification**: Email generation tested and working "much better" - AI correctly identifies sender vs target context

**August 5, 2025**: Modular Tone Configuration Architecture ✅ TESTED
- Refactored tone system into clean, maintainable modular architecture
- Created dedicated `tone-configs.ts` file separating configuration from business logic
- Reduced `service.ts` from 135 to 88 lines by extracting 70+ lines of configuration data
- Added robust error handling with `getToneConfig()` function and graceful fallback to default tone
- Enhanced system message structure with explicit GREETING, WRITING STYLE, and CLOSING instruction sections
- Created `TONE_OPTIONS` export ready for frontend UI integration
- Improved maintainability: adding new tones no longer requires editing service logic
- **User Verification**: System tested and working "fantastic" - tone instructions properly followed

**August 5, 2025**: Granular Email Tone System Implementation
- Implemented comprehensive tone selection system with 6 distinct tones (Silly, Friendly, Default, Direct, Abrupt, BEAST MODE)
- Created granular tone configuration with specific instructions for greetings, writing style, closings, and additional guidance
- Enhanced prompt construction with targeted style guidelines instead of generic system messages
- Added backwards-compatible tone parameter to email generation API
- Maintained all existing functionality while enabling precise personality control for email generation

**August 4, 2025**: Email Content Spacing Fix
- Fixed email content parsing to preserve paragraph spacing from AI responses
- Removed line filtering that was stripping all empty lines and cramping email text
- AI-generated emails now display with proper paragraph breaks and whitespace
- Single code change in parseEmailResponse function preserves original AI formatting

**August 1, 2025**: Email Generation Feature Modularization
- Successfully modularized email content generation into focused, maintainable modules
- Created backend structure: `server/email-content-generation/` with service, routes, and types
- Created frontend structure: `client/src/email-content-generation/` with hooks, services, and utilities
- Extracted scattered logic from oversized files (routes.ts 4000+ lines, outreach.tsx 2000+ lines)
- Established reusable pattern for future feature modularization
- Maintained all existing functionality and performance
- Documented technical approach in `docs/2025-08-01-email-generation-modularization.md`

**August 1, 2025**: Email Search Database Update Fix
- Fixed critical Apollo and Hunter email search database constraint violations
- Resolved PostgreSQL GENERATED ALWAYS AS IDENTITY conflicts in contact updates
- Restored full multi-tier email discovery: Perplexity + Apollo + Hunter working
- Performance increase: 9 → 14+ emails per search, with proper source attribution

**July 31, 2025**: Documentation consolidation and accuracy improvements
- Updated DEPLOYMENT.md with correct PostgreSQL terminology and database setup instructions
- Fixed table count accuracy in setup guides (15 tables, not 8)
- Removed duplicate setup instructions to eliminate confusion
- Added database recovery section for deleted database scenarios

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