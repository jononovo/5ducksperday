npm run db:push
```

This command will create all necessary tables based on the schema defined in `shared/schema.ts`.

### 3. Storage Architecture
The application uses a modular storage architecture divided into specialized components:

- `storage/index.ts`: Core storage interface definitions
- `storage/database.ts`: Main database storage implementation
- `storage/companies.ts`: Company-related operations
- `storage/contacts.ts`: Contact management and enrichment
- `storage/search.ts`: Search approach configurations
- `storage/campaigns.ts`: Campaign management
- `storage/templates.ts`: Email template handling

Each storage module is responsible for its specific domain and implements the relevant interface methods defined in `storage/index.ts`.

### 4. Default Data Initialization
The application automatically initializes default data when it starts:
- Default search approaches for company analysis
- Sample email templates

This initialization happens through dedicated storage modules:
- `SearchStorage.initializeDefaultSearchApproaches()`
- `TemplateStorage.initializeDefaultEmailTemplates()`

To customize or disable these initializations:
1. Modify the default data arrays in these functions
2. Or comment out their initialization in `storage/database.ts`

## Database Schema
The database schema is defined in `shared/schema.ts` and includes the following tables:
- `lists`: Stores company search lists
- `companies`: Company information and analysis
- `contacts`: Contact information for each company
- `searchApproaches`: Analysis strategies for company research
- `campaigns`: Marketing campaign management
- `emailTemplates`: Reusable email templates

Each table includes important fields for tracking and management:
- Auto-incrementing IDs
- Timestamps for creation and updates
- Proper foreign key relationships

### 4. Search System Architecture

#### UI to Backend Connection
The search system's UI is primarily managed through two main components:
- `client/src/components/search-approaches.tsx`: Manages search approach configuration
- `client/src/components/search-flow-new.tsx`: Handles the search flow interface

These components connect to the backend through:
1. API endpoints for CRUD operations on search approaches
2. Real-time updates using React Query for state management

#### Prompt Management
Prompts are stored in the database and managed through:
1. Frontend:
   - Edit forms in `search-approaches.tsx`
   - Uses React Query mutations for updates
   - Automatic cache invalidation on changes

2. Backend:
   - `server/storage/search.ts` handles database operations
   - Implements CRUD operations for search approaches
   - Manages both user-facing and technical prompts

#### Search Implementation Structure
The search system is organized in layers:

1. Frontend Layer:
   ```
   components/
   ├── search-approaches.tsx  # Configuration UI
   ├── search-flow-new.tsx   # Search flow interface
   └── ui/                   # Shared UI components
   ```

2. Backend Layer:
   ```
   server/
   ├── storage/
   │   └── search.ts       # Database operations
   └── lib/
       └── search-logic/   # Search implementation
           ├── deep-searches/     # Specialized searches
           ├── email-discovery/   # Email-specific logic
           └── shared/           # Common utilities
   ```

3. Module Types and Their Functions:

   a. Company Overview Module:
      - Purpose: Comprehensive analysis of company details and metrics
      - Key Features:
        * Age and size analysis
        * Business focus identification
        * Industry classification
        * Market presence evaluation
      - Implementation: `server/lib/search-logic/deep-searches/company-overview/`
      - Configuration Options:
        * Ignore franchises
        * Local headquarters focus
        * Custom validation rules

   b. Decision Maker Analysis Module:
      - Purpose: Identify and analyze key decision-makers within companies
      - Key Features:
        * Leadership team identification
        * Role verification
        * Contact information gathering
        * Priority scoring
      - Implementation: `server/lib/search-logic/deep-searches/decision-maker/`
      - Special Capabilities:
        * Local source integration
        * Business association cross-referencing
        * Social profile matching

   c. Email Discovery Module:
      - Purpose: Find and validate professional email addresses
      - Key Features:
        * Pattern-based email discovery
        * Multi-source validation
        * Confidence scoring
      - Implementation: `server/lib/search-logic/email-discovery/`

4. Subsections System:

   The search system uses a modular subsections architecture for flexible search configurations:

   a. Current Implementation:
      - Subsections are defined per module type
      - Configured through the UI in `search-approaches.tsx`
      - Stored in the database with the search approach
      - Executed based on selected options

   b. Areas for Improvement:
      - [ ] Dynamic subsection loading based on module type
      - [ ] Better validation rules per subsection
      - [ ] Improved confidence scoring for subsection results
      - [ ] Enhanced error handling for failed subsections
      - [ ] More granular control over subsection execution order
      - [ ] Better documentation of subsection dependencies
      - [ ] Performance metrics for individual subsections
      - [ ] Caching strategy for subsection results
      - [ ] Configuration versioning for subsections
      - [ ] Testing framework for subsection validation

   c. Subsection Types:
      - Local Sources:
        * News searches
        * Business association lookups
        * Local directory scanning
      - Digital Sources:
        * Website analysis
        * Social media presence
        * Online directories
      - Validation Sources:
        * Cross-reference checking
        * Data consistency verification
        * Timestamp validation


### 5. Default Data Initialization
The application automatically initializes default data when it starts:
- Default search approaches for company analysis
- Sample email templates

This initialization happens through dedicated storage modules:
- `SearchStorage.initializeDefaultSearchApproaches()`
- `TemplateStorage.initializeDefaultEmailTemplates()`

To customize or disable these initializations:
1. Modify the default data arrays in these functions
2. Or comment out their initialization in `storage/database.ts`

## Development

1. Start the development server:
```bash
npm run dev
```

2. The application will be available at `http://localhost:3000`

## Adding New Database Features

1. Update the schema in `shared/schema.ts`
2. Add corresponding interface methods in `storage/index.ts`
3. Implement the new methods in the appropriate storage module
4. Update the database storage class to delegate to the new implementation
5. Run migration:
```bash
npm run db:push