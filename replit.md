# 5Ducks B2B Prospecting Application

## Overview

5Ducks is a comprehensive B2B lead generation and prospecting platform designed to help small businesses "sell to 5 new people every day." The application combines AI-powered company search, contact discovery, email enrichment, and campaign management into a unified platform. Built with React frontend and Express/Node.js backend, it uses PostgreSQL for data persistence and integrates with multiple third-party APIs for contact discovery and validation.

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
- **Drizzle ORM** for database operations with strong type safety
- **PostgreSQL** as primary database (with Replit DB migration option available)
- **Passport.js** for authentication with Firebase Auth integration
- **Modular API design** with separate route handlers and business logic

### Database Design
- **PostgreSQL** with Drizzle ORM for type-safe database operations
- **Schema-first approach** using Zod for validation
- **Normalized relational structure** with proper foreign key relationships
- **Storage abstraction layer** allowing for backend switching (PostgreSQL/Replit DB)

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
- **Webhook system** handles external workflow integration (N8N)
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
- **PostgreSQL**: Primary database (Neon/Replit)
- **N8N Workflows**: External automation integration
- **Google APIs**: Gmail integration for email campaigns

### Development Tools
- **Vite**: Frontend build tool and dev server
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Backend bundling for production

## Deployment Strategy

### Development Environment
- **Replit-optimized**: Configured for Replit's development environment
- **Hot reloading**: Vite provides instant frontend updates
- **Database provisioning**: Automatic PostgreSQL setup on Replit
- **Port configuration**: Frontend (3000) and backend (5000) ports configured

### Production Deployment
- **Google Cloud Run**: Containerized deployment target
- **Build process**: Vite builds static assets, ESBuild bundles backend
- **Environment variables**: Database URLs and API keys via environment
- **Workflow integration**: N8N webhooks for external automation

### Storage Migration Strategy
- **Dual storage support**: PostgreSQL and Replit Database compatibility
- **Migration utilities**: Scripts for data migration between storage backends
- **Storage abstraction**: IStorage interface allows runtime switching
- **Cleanup tools**: Scripts to remove migration infrastructure when complete

## Changelog
- June 13, 2025. Initial setup
- June 13, 2025. Mobile UI optimizations: Fixed duck header positioning (-mt-1), reduced email form horizontal padding (p-6→px-3 py-6 md:p-6) for 24px wider mobile inputs, updated "Save Template" to "Save as Template", and removed chevron arrow from mobile duck header navigation button
- June 13, 2025. Edge-to-edge mobile input layout: Implemented Gmail-style mobile input fields with zero horizontal margins (px-0), added border separators between fields, and maintained desktop spacing while maximizing mobile typing space
- June 13, 2025. Mobile input visual enhancements: Added subtle bluish background colors to mobile inputs with darker shade on focus/active states, replacing border highlighting with smooth background transitions for better edge-to-edge design consistency
- June 13, 2025. Clean CSS architecture: Removed !important hacks and properly overrode shadcn focus styling using focus-visible:ring-0 and focus-visible:ring-offset-0 Tailwind classes. Added consistent left padding (px-3) to generate email and email content fields for better text positioning
- June 13, 2025. Contact navigation UX improvement: Added ChevronRight icon to mobile contact toggle button (showing contact count like "2/3") to provide visual indication of interactivity without changing button behavior
- June 13, 2025. Navigation consistency: Added ChevronRight icons to both mobile navigation buttons - contact button with standard styling and company button with lighter gray (text-muted-foreground/50) to match existing visual hierarchy
- June 13, 2025. Button design updates: Made Save as Template and Send Email buttons smaller to match Generate Email button size (h-8 px-3 text-xs), and changed Send Email button to white background with black border and text for clean minimal styling
- June 13, 2025. Simplified Send Email button hover: Clean color reversal hover effect (white→black background, black→white text) with 105% scaling and smooth 300ms transitions
- June 13, 2025. Consistent button hover animations: Added 105% scaling hover effect with smooth 300ms transitions to Generate Email and Save as Template buttons, maintaining their original colors while providing unified interaction feedback
- June 13, 2025. New Template button standardization: Made "New Template" button smaller (h-8 px-3 text-xs) to match other action buttons and added the same 105% scaling hover effect with smooth transitions
- June 14, 2025. iOS Safari auto-zoom prevention: Added mobile-input-text-fix CSS class (16px font-size on mobile, 14px on desktop) to all outreach page input fields to prevent automatic zoom behavior while preserving design on larger screens
- June 14, 2025. Simplified email prompt placeholder: Removed "Example:" prefix from email prompt field placeholder text, changing from "Example: Sell dog-grooming services" to "Sell dog-grooming services" for cleaner UX
- June 14, 2025. Inline email body buttons: Moved "Save as Template" and "Send Email" buttons inside the email body textarea field using absolute positioning, matching the Generate Email button pattern for consistent UI design
- June 14, 2025. Relocated Save as Template button: Moved "Save as Template" button from email body field to Quick Templates section header, positioned next to "New Template" button for better organization and cleaner email body interface
- June 14, 2025. Complete inline merge system for Create Template dialog: Added "Merge" dropdown buttons to all three fields (Email Subject, Description/Prompt, Email Body) with predefined merge variables ({{company_name}}, {{contact_name}}, {{contact_role}}, {{sender_name}}). Implemented consistent positioning using relative containers with absolute bottom-2 right-2 button placement and pb-10/pb-12 padding for proper text spacing
- June 14, 2025. Comprehensive merge field dialog system: Created dedicated MergeFieldDialog component with 13 merge variables, responsive design (full-page mobile, standard desktop), copy-to-clipboard functionality with visual feedback, and auto-close after 1 second. Added "Merge Field" button to Quick Templates header for easy access across the application
- June 14, 2025. Removed Create Template Dialog: Eliminated 350+ lines of duplicated code by removing CreateTemplateModal component and all related functionality. Template creation now streamlined through outreach page "Save as Template" workflow only, reducing code complexity and improving user experience
- June 14, 2025. Button size standardization: Updated "Insert Template" button to match smaller sizing (h-8 px-3 text-xs), consistent hover animation (scale-105), content-based width (removed w-full), right alignment (justify-end), secondary variant styling, right margin (mr-2), FileText icon, and restored disabled state when no template selected for proper UX feedback in Quick Templates section
- June 14, 2025. Edit Template functionality: Added "Edit Template" button next to "Insert Template" with Edit icon, same disabled logic when no template selected, and confirmation dialog warning "Editing this template, will replace all content currently in fields on this page" with Cancel/Load Template options using shadcn AlertDialog components
- June 14, 2025. Complete merge field insertion system: Implemented clickable merge field functionality with React refs for all form inputs (email prompt, subject, content, recipient), cursor position handling, and MergeFieldDialog integration that inserts merge variables directly at cursor position instead of clipboard copy
- June 14, 2025. Mobile navigation spacing optimization: Refined company button spacing with mr-0.5 between Building2 icon and "7/7" text for better readability, while maintaining gap-0 base spacing and tight chevron positioning. Contacts button remains with uniform gap-0 spacing throughout
- June 14, 2025. Clean templates section layout: Removed "Quick Templates" heading and added pt-6 padding above templates section for better visual separation from email body input. Right-aligned action buttons (Merge Field, Save as Template) for cleaner interface design
- June 14, 2025. Unified margin strategy implementation: Applied consistent mr-2 margin pattern (matching Save as Template button) to template dropdown SelectTrigger and both Insert/Edit Template buttons for reliable mobile spacing and visual consistency
- June 14, 2025. Insert Template confirmation dialog: Added confirmation dialog to "Insert Template" button matching Edit Template pattern, with title "Load Template" and warning "Loading this template, will replace all content currently in fields on this page" for consistent user protection against data loss
- June 14, 2025. Complete template edit mode system: Implemented comprehensive template editing with mode switching (Edit Template ↔ Save Template), red "Edit Template Mode" notification banner, content resolution showing handlebars vs resolved merge fields based on mode, and full backend support with PUT endpoint and storage methods for seamless same-page template editing and preview
- June 14, 2025. Template name preservation fix: Resolved critical bug where template updates were hardcoded to "Updated Template" name. Added editingTemplate state to store complete template object during editing, ensuring original template names are preserved during updates while allowing content modifications
- June 14, 2025. Merge field highlighting removal: Completely removed all merge field highlighting functionality including overlay components, context providers, and enhanced input components. Reverted to standard Input and Textarea components for cleaner, simpler form handling without visual highlighting complexity
- June 14, 2025. Complete merge view toggle system: Implemented toggle between "Merge View" (showing technical syntax like {{company_name}}) and "Normal View" (showing resolved values like "Boston Centerless"). Added isMergeViewMode state to outreach page, updated getDisplayValue and content resolution functions to consider merge view mode, button toggles between "Merge View"/"Normal View" labels with EyeOff icon, and added blue notification banner in Quick Templates section for clear visual feedback
- June 14, 2025. Merge Fields Dialog copy icon fix: Separated clipboard functionality from direct insertion logic. Created dedicated handleCopyToClipboard function that always copies merge fields (with handlebars) to clipboard, while handleFieldSelect remains for direct form insertion. Copy icon now properly copies to clipboard with green checkmark feedback, following existing codebase patterns
- June 14, 2025. Merge Fields Dialog unified copy behavior: Reverted row insertion logic to use clipboard functionality instead. Both row clicks and copy icon clicks now perform identical actions - copy merge field to clipboard, show green checkmark feedback, and auto-close dialog after 0.8 seconds. Removed event propagation conflicts since both actions are now unified

## User Preferences

Preferred communication style: Simple, everyday language.
Mobile UI preference: Compact, space-efficient design with seamless header-to-content transitions.