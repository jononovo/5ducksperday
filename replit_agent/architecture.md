# Architecture Overview

## 1. System Overview

This application is a full-stack web application built with a React frontend and Node.js/Express backend, designed for discovering and managing business contacts. The system appears to be focused on email discovery, company analysis, and contact management with sophisticated search capabilities.

The application follows a client-server architecture:
- **Frontend**: React application with modern UI components (Radix UI/Shadcn)
- **Backend**: Express.js server with structured search modules
- **Database**: PostgreSQL with Drizzle ORM
- **Deployment**: Configured for Cloud Run via Replit

## 2. Tech Stack

### Frontend
- **Framework**: React
- **UI Components**: Radix UI component library with Shadcn styling
- **State Management**: React Query for server state
- **Styling**: Tailwind CSS
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with TypeScript
- **Server**: Express.js
- **Database Access**: Drizzle ORM
- **Schema Validation**: Zod

### Database
- **Database**: PostgreSQL (via Neon serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **Schema**: Strongly typed with Zod validation

### Build & Deployment
- **Build**: Vite for frontend, ESBuild for backend
- **Deployment**: Cloud Run (via Replit)
- **Development**: Replit environment with local PostgreSQL

## 3. Core Architecture Components

### 3.1 Frontend Structure

The frontend is organized in a feature-based structure:
```
client/
├── src/
│   ├── components/  # Reusable UI components
│   ├── lib/         # Frontend utilities
│   └── pages/       # Page components
```

### 3.2 Backend Structure

The backend follows a modular architecture with clear separation of concerns:
```
server/
├── lib/            # Core business logic
│   ├── search-logic/  # Search implementation
│   ├── perplexity/    # AI integration
│   └── api/          # API clients
├── storage/        # Database operations
└── routes/         # Express routes
```

### 3.3 Shared Code

The application maintains shared types and schemas between frontend and backend:
```
shared/
└── schema.ts       # Database schema and type definitions
```

## 4. Key Architectural Patterns

### 4.1 Database Layer

The application uses a strongly-typed database access approach:

- **Schema Definition**: Centralized in `shared/schema.ts` using Drizzle's schema definition
- **Type Safety**: End-to-end type safety from database to frontend using Zod schemas
- **Connection Pool**: Managed via Neon serverless Postgres client

Database schema includes:
- `users`: User accounts
- `lists`: Collections of companies
- `companies`: Business entities with detailed information
- `contacts`: Individual contacts with confidence scores

### 4.2 Search Architecture

The system implements a sophisticated search architecture for email and contact discovery:

1. **Modular Search Implementation**:
   - Each search module is a self-contained unit
   - Modules include different search strategies for contact discovery

2. **Multi-Source Integration**:
   - Crawls websites and social sources
   - Implements pattern prediction for email discovery
   - Integrates with external APIs and services

3. **Validation Pipeline**:
   - Confidence scoring for search results
   - Structured validation rules for contact information
   - Multi-stage verification of discovered emails

### 4.3 AI Integration

The application leverages AI for contact discovery and data extraction:

- **Perplexity API Integration**: Used for analyzing companies and extracting contact information
- **Structured Prompting**: System uses templated prompting to extract specific information
- **Result Processing**: Parse and validate AI results before storing

## 5. Authentication

The system implements multiple authentication methods:

1. **Local Authentication**:
   - Password-based using scrypt for password hashing
   - Session management via express-session

2. **Firebase Authentication**:
   - Token verification using Firebase Admin SDK
   - Used as an alternative authentication method

## 6. External Integrations

The application integrates with several external services:

1. **AI Services**:
   - Perplexity API for text analysis and information extraction

2. **Email Services**:
   - Google APIs for Gmail integration

3. **Productivity Tools**:
   - Slack API integration

## 7. Data Flow

### 7.1 Company and Contact Discovery Flow

1. User initiates search with criteria
2. Backend processes search through multiple search modules
3. Results are validated, scored and stored in database
4. Contacts are enriched in post-search processes
5. Frontend displays results with confidence indicators

### 7.2 Email Enrichment Flow

1. System identifies contacts for enrichment
2. Queue-based processing manages batch enrichment
3. Multiple strategies attempt email discovery
4. Discovered emails are validated and scored
5. Results update contact records with confidence scores

## 8. Deployment Architecture

The application is configured for deployment on Cloud Run via Replit:

1. **Build Process**:
   - Frontend: Vite bundling to static assets
   - Backend: ESBuild to Node.js compatible bundle

2. **Runtime Configuration**:
   - Environment variables for API keys and database credentials
   - Production optimizations for Node.js server

3. **Database**:
   - Neon serverless PostgreSQL for production
   - Schema managed through Drizzle ORM

## 9. Security Considerations

1. **Authentication**: Secure authentication with Firebase option
2. **Password Storage**: Scrypt with salt for password hashing
3. **API Security**: Authorization middleware for protected routes
4. **Data Validation**: Strong input validation via Zod schemas

## 10. Extensibility Points

The architecture is designed for extensibility in several areas:

1. **Search Modules**: New search strategies can be added to the modular search system
2. **AI Integration**: The templated AI prompting system can be extended
3. **Email Discovery**: Additional email discovery strategies can be implemented
4. **External APIs**: The system can integrate with additional external services