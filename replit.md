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

- July 25, 2025. **Contact Page Title Standardization**: Updated contact page title styling to match pricing page consistency. Changed from `text-5xl mb-8` to `text-4xl mb-4` for uniform font size (36px vs 48px) and margin (16px vs 32px) across all static pages. Maintains friendly messaging and emoji while achieving professional visual consistency. LinkedIn button successfully integrated into Personal Contact card with subtle border separator. Files modified: `static/contact.html`.

- July 25, 2025. **Contact Page Enhancement with Bug Reports & Feature Requests**: Added two new contact cards below existing personal/general contact options. "Submit Bugs" card includes 📋 Report a Bug button with subtext requesting screenshots and detailed information. "Suggest Features" card includes 💡 Share Your Ideas button with sales-focused messaging emphasizing features that help users "sell more better easier". Both cards use consistent subtle gray styling matching existing contact page design, target quack@5ducks.ai email, and include clipboard copy functionality with green success states. Enhanced JavaScript with bug report and feature request event listeners following same interaction pattern as existing buttons. Files modified: `static/contact.html`.

- July 25, 2025. **Active Menu State Navigation System**: Implemented comprehensive active menu indicator system across all static pages using JavaScript-based URL detection. Created `static/js/active-menu.js` with path mapping logic (landing/app → search, /pricing → pricing, /contact → contact) and CSS injection for blue underline and font weight styling. Added data attributes (`data-nav-item`) to all desktop and mobile navigation links across landing, pricing, and contact pages. Active menu items display with blue text color (#1d4ed8), increased font weight (600), and blue bottom border (#2563eb) for clear visual indication of current page location. System works seamlessly across desktop horizontal navigation and mobile hamburger menus. Files created: `static/js/active-menu.js`. Files modified: `static/landing.html`, `static/pricing/index.html`, `static/contact.html`.

- July 25, 2025. **Contact Page Professional Color Revision**: Updated contact page email reveal buttons from bright purple and dark gray to subtle, professional gray styling matching pricing page design aesthetic. Changed both personal and general email buttons to light gray background (`bg-gray-50`), gray text (`text-gray-700`), and subtle border (`border-gray-200`) with hover states. Updated success states from bright green backgrounds to muted green styling (`bg-green-100`, `text-green-700`, `border-green-300`) for professional appearance. Maintains all existing functionality while achieving visual consistency across static pages. Files modified: `static/contact.html`.

- July 25, 2025. **Contact Navigation Integration**: Added "Contact" menu item to all static page navigation systems. Desktop horizontal navigation now shows "Search | Pricing | Contact" while mobile hamburger menus include all three options. Contact links point to `/contact` and are consistently styled across landing, pricing, and contact pages. Removed React contact route and component to allow static page to be served properly. Added explicit route handler `app.get('/contact')` in `server/routes.ts` to serve static contact page, matching the proven pattern used for pricing page. Completes unified navigation structure across all static pages for seamless user experience. Files modified: `static/landing.html`, `static/pricing/index.html`, `static/contact.html`, `client/src/App.tsx`, `server/routes.ts`. Files removed: `client/src/pages/contact.tsx`.

- July 25, 2025. **Personal Contact Page Implementation**: Created friendly, personal contact page with email reveal functionality and vibe coding story. Features "Hey! So excited to hear from you" greeting, two email reveal buttons (Personal: jon@5ducks.ai, General: quack@5ducks.ai) that copy addresses to clipboard with feedback messages. Includes LinkedIn profile link and "Vibe Coding" section describing how this app was 100% vibe coded over months with lessons learned. JavaScript handles email hiding from scrapers and clipboard copying. Maintains consistent header/footer styling with other static pages. Files modified: `static/contact.html`, `replit.md`.

- July 25, 2025. **Search Menu Item Addition to Static Pages**: Added "Search" menu item to both desktop navigation and mobile dropdown menus on static landing and pricing pages. The Search link directs users to `/app` (main application page). Implemented consistently across both static pages with identical styling and responsive behavior. Desktop navigation now shows "Search | Pricing" while mobile hamburger menu includes both options. Files modified: `static/landing.html`, `static/pricing/index.html`.

- July 25, 2025. **Strategy Tab Removal from Main Navigation**: Removed Strategy tab from main horizontal navigation menu to simplify the interface. Strategy page remains accessible through the dropdown menu (hamburger menu) on the right side of the navigation bar. This reduces visual clutter in the main navigation while maintaining full functionality access. Files modified: `client/src/components/main-nav.tsx`.

- July 25, 2025. **Landing Page Subtitle Enhancement**: Updated static landing page subtitle from "Find companies, contacts & their emails with a prompt 🎯" to "Start by finding companies, contacts & their emails with a prompt 🎯" for improved user guidance and call-to-action clarity. The addition of "Start by" creates a more instructional tone that better guides new users through the platform's primary value proposition. Files modified: `static/landing.html`.

- July 25, 2025. **Privacy Policy Professional Email Standardization**: Updated all privacy-related contact emails from "quack@5ducks.ai" to "privacy@5ducks.ai" throughout privacy policy for more professional communication. Changed emails in California Privacy Rights section (line 280), GDPR Data Protection Officer contact (line 310), main Contact Us section (line 319), and general privacy rights section (line 212). Also standardized domain from ".com" to ".ai" for complete consistency. This enhances the serious, professional tone appropriate for privacy inquiries, data protection requests, and legal compliance matters. Files modified: `client/public/privacy.html`.

- July 25, 2025. **Privacy Policy AI Compliance Updates**: Updated privacy policy for comprehensive Google API compliance and AI data usage requirements. Added complete "AI-Powered Email Response Suggestions" section detailing no AI analysis of Google Workspace/Photos API data, Google API Services User Data Policy adherence, and strict data separation protocols. Removed outdated International Transfers and Data Retention language from GDPR section. Updated policy date to July 24, 2025. Ensures full compliance with Google's Limited Use requirements while maintaining clear user consent framework for optional AI features. Files modified: `client/public/privacy.html`.

- July 25, 2025. **Secure Gmail Connect Button Enhancement**: Enhanced "Connect Gmail" button with trust-building security messaging by replacing Mail icon with Lock icon and updating text to "Secure Gmail Connect". This psychological enhancement emphasizes security and privacy protection to increase user confidence in authorizing Gmail OAuth permissions. Maintains existing blue trust color scheme (bg-blue-50, text-blue-700, border-blue-300) and identical OAuth functionality while improving perceived security. Simple 2-line change in `client/src/pages/outreach.tsx` with minimal implementation complexity and zero breaking changes. Files modified: `client/src/pages/outreach.tsx`.

- July 25, 2025. **Professional Gmail Sender Name Implementation**: Implemented complete professional email sender identity system across all Gmail sending functionality. Added `userinfo.profile` OAuth scope to collect display names during Gmail authorization, extended `UserTokens` interface with `gmailDisplayName` field for Replit Database storage, and updated all email sending endpoints to use RFC 2822 compliant "Display Name <email@address.com>" format. Enhanced OAuth callback in `/api/gmail/callback` to capture user profile information, updated `TokenService.getGmailUserInfo()` to return both email and displayName, and modified three core email sending locations: `/api/send-gmail` endpoint (main outreach), `GmailProvider.createThread()` method (new conversations), and `GmailProvider.createMessage()` method (replies). Includes graceful fallback to email-only format for existing users without display names and automatic professional formatting for new Gmail authorizations. Backward compatible with existing token storage using optional database field. Files modified: `server/lib/tokens/types.ts`, `server/lib/tokens/index.ts`, `server/routes.ts`, `server/services/emailService.ts`.

- July 24, 2025. **Gmail OAuth Scope Optimization**: Implemented comprehensive Gmail OAuth scope simplification by eliminating redundant permissions and removing Gmail Profile API dependencies. Updated OAuth scopes from `[gmail.readonly, gmail.send, gmail.modify]` to `[gmail.modify, userinfo.email]` removing redundancy since `gmail.modify` includes both reading and sending permissions. Replaced `gmail.users.getProfile()` calls with standard OAuth `userinfo.email` endpoint in callback route (`/api/gmail/callback`) and EmailService `getUserEmail()` method. Removed `gmailName` field from `UserTokens` interface as names will be collected via modal/dialog system. Updated email sending logic in `/api/send-gmail` endpoint and EmailService methods (`createThread`, `createMessage`) to use email-only sender format. This optimization reduces Gmail API dependency, uses standard OAuth patterns, eliminates scope inconsistency, and prepares for user-controlled name collection. Zero breaking changes for new users; existing users require Gmail re-authorization (one-time). Files modified: `server/routes.ts`, `server/lib/tokens/types.ts`, `server/lib/tokens/index.ts`, `server/services/emailService.ts`.

- July 24, 2025. **Firebase Token Storage Cleanup**: Removed unused Firebase ID token storage from dual authentication architecture to eliminate confusion between short-lived Firebase tokens (1 hour) and properly managed Gmail OAuth tokens (1 hour + 90 day refresh). Removed `firebaseIdToken` field from `UserTokens` interface in `server/lib/tokens/types.ts` and cleaned up storage logic in `storeGmailTokens()` method. This architectural improvement has zero breaking changes since authentication flows use Firebase Admin SDK validation directly rather than stored tokens. Firebase SDK continues automatic token refresh on frontend while Gmail OAuth tokens use proper refresh mechanism. Clean separation between user authentication (Firebase) and email permissions (Gmail OAuth) with no deprecated fields.

- July 23, 2025. **Gmail Token Refresh Implementation**: Implemented complete on-demand Gmail OAuth token refresh system to eliminate frequent re-authorization prompts. Fixed broken `refreshGmailToken()` method in `server/lib/tokens/index.ts` by replacing stub implementation with working Google OAuth2 refresh flow using correct `GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET` credentials. Added enhanced error responses in `/api/send-gmail` endpoint with detailed refresh status. Gmail tokens now automatically refresh when sending emails (5-minute expiry threshold), extending authentication from 1 hour to ~90 days (refresh token lifetime). Dramatically improved user experience by reducing re-authorization frequency while maintaining security. Uses existing OAuth credentials and storage architecture with zero breaking changes.

- July 23, 2025. **Gmail Sender Name Implementation**: Successfully implemented automatic Gmail display name integration across all email sending functionality. Modified three locations: `/api/send-gmail` endpoint (main outreach), `createThread()` method (new conversations), and `createMessage()` method (replies) in `server/routes.ts` and `server/services/emailService.ts`. Emails now show "John Smith <user@gmail.com>" instead of just "user@gmail.com" as sender. Implementation uses existing `TokenService.getGmailUserInfo()` method with RFC 2822 compliant formatting, automatic quote handling for special characters, and graceful fallback to email-only format. Fixed duplicate TokenService import in routes.ts. Professional sender identity now maintained across all Gmail OAuth email sending.

- July 23, 2025. **Account Page Products Section Removal**: Completely removed the "Products" section from `/account` page (client/src/pages/account.tsx lines 263-280). Removed Card container, CardHeader with Package icon and title/subtitle, CardContent with placeholder text "Product information will be available here soon", and cleaned up unused Package import from lucide-react. Account page now streamlined with only Profile and Billing sections for cleaner user experience.

- July 23, 2025. **Navigation Menu Updates**: Renamed "Create Strategy" to "Strategy" in main dropdown menu and changed functionality from opening chat overlay to navigating to `/strategy` page using standard Link component. Completely removed "Lists" menu item from dropdown (lines 108-113) and cleaned up unused ListTodo import. Dropdown now contains: Logout, Build, Account, Campaigns, Strategy.

- July 23, 2025. **Test Strategy Chat Button Removal**: Removed the blue "Test Strategy Chat" button from bottom-right corner of search page (home.tsx lines 2845-2857). Strategy chat remains fully accessible via main navigation "Strategy" tab and user dropdown "Create Strategy" option. Cleanup completed as test button was no longer needed after successful integration.

- July 23, 2025. **Strategy Dashboard Delete Functionality Implementation**: Added complete 3-dots dropdown menu delete functionality to strategy dashboard product cards. Implemented `DropdownMenu` component with "View Details" and "Delete Strategy" options, replacing previous eye icon button. Added confirmation dialog with simplified message "Are you sure you want to delete this product/strategy?" Connected to existing `DELETE /api/strategic-profiles/:id` endpoint with proper user authorization. Enhanced ReplitStorage class with complete strategic profile CRUD methods: `getStrategicProfiles()`, `createStrategicProfile()`, `updateStrategicProfile()`, and `deleteStrategicProfile()`. Added mutation with TanStack Query for real-time UI updates and toast notifications. Users can now safely delete strategies with proper confirmation workflow.

- July 23, 2025. **Strategy Chat Restart Cleanup Implementation**: Implemented complete "Restart Strategy" database cleanup functionality specifically for React Strategy Chat system. Added `deleteStrategicProfile()` method to storage interface, created secure `DELETE /api/strategic-profiles/:id` endpoint with user authorization, and enhanced `handleRestart()` function to find and delete matching in-progress profiles before clearing frontend state. Commented out deprecated HTML landing page version (`/api/onboarding/chat`) to prevent AI confusion. Users can now restart strategies without abandoned profiles persisting as "In Progress" on dashboard. Complete cleanup includes database deletion, cache invalidation, and graceful error handling with frontend state reset fallback.

- July 23, 2025. **Strategy Chat Data Extraction Issue Fixed**: Successfully resolved critical data extraction issue where HTML markup was being saved to database instead of clean text. Fixed profile creation flow to ensure in-progress profiles are created during strategy generation and properly updated with clean data throughout the chat flow. Save endpoint now uses existing clean database data rather than extracting HTML from chat messages. Strategy dashboard now displays clean, formatted text like "Commercial property managers of NYC multifamily apartment buildings and mixed-use developments" instead of raw HTML markup. Complete end-to-end strategy planning workflow now functional with proper data persistence and user-controlled saving.

- July 23, 2025. **React Strategy Chat Integration Completed**: Successfully integrated all 5 core strategy chat files with full functionality preservation. Fixed critical state management mismatch between StrategyOverlay local state and context provider system. Strategy chat now accessible via three methods: main navigation "Strategy" tab, user dropdown "Create Strategy", and blue test button (bottom-right). Overlay renders properly in sidebar mode (desktop) and fullscreen mode (mobile). Complete conversation flow working: target collection → boundary selection → progressive strategy generation → daily search queries → completion with prospecting link. All backend APIs functional (/api/onboarding/strategy-chat, /api/strategy/boundary/confirm). User tested and confirmed working in both narrow and full screen views.

- July 22, 2025. **Credit System Bonus Structure Update**: Implemented comprehensive credit system updates to match new pricing structure. Updated credit dropdown to display "2,000 Credits + 3,000 Bonus" for The Duckling and "5,000 Credits + 10,000 Bonus" for Mama Duck plans. Backend now provides 5,000 total monthly credits for Duckling subscribers and 15,000 for Mama Duck subscribers. Enhanced monthly top-up transaction descriptions to include base + bonus breakdown for transparency. Increased free tier from 180 to 250 credits monthly for new users. Added support for Mama Duck plan (`duckin-awesome`) in subscription system. Used simple total approach for backend credit management while maintaining marketing-friendly frontend display.

- July 22, 2025. **Static Pricing Page Dark Mode Prevention**: Fixed Login button dark mode styling by implementing modern Tailwind config approach. Updated from deprecated `darkMode: false` to `darkMode: 'selector'` with JavaScript prevention script. Added MutationObserver to actively prevent dark class application, ensuring consistent light mode appearance regardless of system preferences. Made logo clickable with hover effects for navigation back to homepage.

- July 17, 2025. **Pricing Page Credit Information Enhancement**: Added comprehensive "How Credits Work" section above FAQ with structured subtitles and detailed explanations. Created "Search Flows" subsection with 3-column layout featuring inline credit display (10, 70, 240 credits) and descriptive content for each search type. Added "Additional credit costs" subsection for email search (20 credits). Used subtle gray colors, rounded-2xl corners matching pricing cards, and reduced prominence per user feedback. Each box includes detailed descriptions: Company Search (7 companies), Company + Contacts (leadership contact discovery), Company + Contacts + Emails (2 emails from top 3 contacts). Section provides educational value while maintaining visual consistency.

- July 17, 2025. **Static Pricing Page Header & Footer Consistency**: Achieved perfect visual consistency between landing page and pricing page by implementing identical header and footer structures. Updated pricing page header to match landing page exactly: removed extra "Get Started" button, added duck emoji branding (🐥🥚🥚🥚🥚), applied gradient background, and ensured Login button points to `/outreach`. Replaced entire footer with exact copy from landing page including four-column layout (5Ducks, Product, Company, Legal), all original links, and three-part bottom section with "Soli Deo Gloria" and LinkedIn link. Both pages now have identical styling, branding, and navigation structure for consistent user experience across static pages.

- July 17, 2025. **Changelog Condensation & Documentation Maintenance**: Condensed massive changelog from 3,447 lines to 170 lines (95% reduction) by retaining 10 most recent detailed commits and converting 3,200+ granular entries into 4 weekly technical summaries. Restructured changelog with "Recent Changes" section for immediate context and "Historical Summary" for architectural evolution. Enhanced weekly summaries with specific file paths, CSS classes, component names, and technical implementation details for easier reversion. Maintained all critical information while creating maintainable, searchable documentation format that balances detailed recent history with concise historical context.

- July 10, 2025. **Complete Account Page Implementation**: Created comprehensive account page with three sections: Profile (name, email, member since date), Products (placeholder), and Billing (placeholder). Added full CRUD API endpoints for user profile management, integrated with existing authentication system. Users can now edit their names (both Google and email/password users), view account creation date, and access organized account settings. System uses existing PostgreSQL database with proper validation and error handling. Account page is fully protected route with proper authentication checks.

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
- July 8, 2025. **Gmail API Integration Implementation**: Completed comprehensive Gmail OAuth integration with proper separation from Firebase authentication. Implemented dual OAuth architecture - Firebase for user authentication, Gmail API for email permissions. Added Gmail connection status checking, Connect Gmail button, and Send Email button that requires Gmail authentication. Gmail tokens stored in Replit key-value database using TokenService. System includes `/api/gmail/auth`, `/api/gmail/callback`, `/api/gmail/auth-status` endpoints and `/api/send-gmail` endpoint that uses Gmail OAuth tokens for email sending. Outreach page now shows Gmail connection status with "Gmail Connected" badge or "Connect Gmail" button, and Send Email button is disabled until Gmail is connected.

- June 24, 2025. **Branding & Copy Updates**: Added "Vibe-coded with ♥️ in NYC" center text using three-item `justify-between` layout in footer component. Reverted landing page hero message to "Then sell to them everyday. ⚡" for action-oriented messaging.

- June 23, 2025. **Production Deployment Configuration**: Modified `server/index.ts` port binding from `localhost` to `0.0.0.0` for Cloud Run compatibility. Made Stripe keys (`STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`, `STRIPE_WEBHOOK_SECRET`) optional in startup configuration. Added graceful fallback logic for missing Stripe configuration.

- June 15, 2025. **UI Polish & Search Optimization**: Implemented comprehensive merge field solution with `originalEmailPrompt`, `originalEmailContent`, `originalEmailSubject` state variables for dual storage system. Removed FileText icons from template dropdown, simplified display, fixed padding from `pl-8` to `pl-3`. Added scroll-triggered compression with emoji size reduction (`text-2xl→text-lg`), padding compression (`pt-2 pb-1→pt-1 pb-0.5`) to duck header animation. Added `mb-6` margin to Quick Templates button row. Fixed ref mismatch (`textareaRef.current` to `emailContentRef.current`), implemented 160px-400px height range for textarea auto-resize. Reduced footer from `text-sm` to `text-xs`, `py-4` to `py-2`, removed copyright text. Changed search chips default to Core Leadership only, disabled Department Heads/Middle Management. Moved search settings to `bottom-8 right-4` with 40% opacity and `h-4 w-4` sizing.

- June 14, 2025. **Template System Architecture & Merge Fields**: Added `mobile-input-text-fix` CSS class (16px mobile, 14px desktop) to prevent iOS Safari auto-zoom. Removed "Example:" prefix from email prompt placeholder text. Moved Save/Send buttons to inline positioning within textarea using absolute positioning. Relocated "Save as Template" from email body to Quick Templates header. Created inline merge system with dropdown buttons for all template fields (`{{company_name}}`, `{{contact_name}}`, `{{contact_role}}`, `{{sender_name}}`). Built responsive MergeFieldDialog component with 13 merge variables, copy-to-clipboard, auto-close after 1s. Removed 350+ lines by eliminating CreateTemplateModal component. Added "Edit Template" button with shadcn AlertDialog confirmation system. Implemented React refs for cursor position handling in all form inputs. Created comprehensive edit system with mode switching, red notification banner, PUT endpoint support. Resolved template name preservation issue by adding `editingTemplate` state storage. Removed merge field highlighting overlay system, reverted to standard Input/Textarea components. Implemented dual view system showing handlebars syntax vs resolved values with `isMergeViewMode` state. Separated clipboard functionality from direct insertion, unified copy behavior with 0.8s auto-close.

- June 13, 2025. **Mobile UI Foundation & Button System**: Project initialization and base configuration. Applied `-mt-1` positioning correction to duck header component. Modified email form padding from `p-6` to `px-3 py-6 md:p-6` for 24px wider mobile inputs. Implemented Gmail-style mobile inputs with `px-0` horizontal margins and border separators. Added bluish background colors (`bg-blue-50/30` focus states) replacing border highlighting. Removed `!important` hacks, implemented proper shadcn overrides with `focus-visible:ring-0` and `focus-visible:ring-offset-0`. Added `ChevronRight` icons to mobile contact/company toggle buttons with conditional styling (`text-muted-foreground/50`). Unified button sizing to `h-8 px-3 text-xs` across Save Template, Send Email, Generate Email, New Template. Implemented consistent `scale-105` hover effects with 300ms transitions.

## User Preferences

Preferred communication style: Simple, everyday language.
Mobile UI preference: Compact, space-efficient design with seamless header-to-content transitions.