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

## User Preferences

Preferred communication style: Simple, everyday language.