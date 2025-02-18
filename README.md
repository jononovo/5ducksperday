.
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/           # Frontend utilities
│   │   └── pages/         # Page components
├── server/
│   ├── lib/               # Core business logic
│   │   ├── search-logic/  # Search implementation
│   │   ├── perplexity/    # AI integration
│   │   └── api/          # API clients
│   ├── storage/          # Database operations
│   └── routes/           # Express routes
└── shared/               # Shared types and schemas
```

### 2. Core Components

#### Database Layer
- PostgreSQL with Drizzle ORM
- Strong type safety through Zod schemas
- Efficient querying with prepared statements

#### Search Modules
Each search module is a standalone unit with:
- Dedicated configuration
- Validation rules
- Implementation strategies
- Result processing

#### Email Discovery System
- Pattern-based discovery
- Multi-source validation
- Confidence scoring
- Domain analysis

## Database Setup

### Prerequisites
1. PostgreSQL database (automatically provisioned on Replit)
2. Database URL in environment variables

### Initial Setup
1. The database is automatically provisioned when the project is created
2. Schema is defined in `shared/schema.ts`
3. Drizzle ORM handles the database operations

### Schema Management
- All schema changes are defined in `shared/schema.ts`
- Tables are created using Drizzle's pgTable
- Relations are explicitly defined using references

### Migrations
1. Schema changes are automatically synchronized
2. To apply changes:
   ```bash
   npm run db:push
   ```
3. No manual migration files needed - Drizzle handles schema updates

### Database Architecture
1. Core Tables:
   - companies: Company profiles and metrics
   - contacts: Contact information and validation
   - lists: Search result groupings
   - campaigns: Marketing campaign management
   - searchApproaches: Search configuration storage

2. Relations:
   - contacts → companies (Many-to-One)
   - companies → lists (Many-to-One)
   - campaignLists → campaigns (Many-to-One)


## 4. Module Types and Their Functions:

   a. Company Overview Module:
      - Purpose: Comprehensive analysis of company details and metrics
      - Key Features:
        * Age and size analysis
        * Business focus identification
        * Industry classification
        * Market presence evaluation
      - Implementation: `server/lib/search-logic/deep-searches/company-overview/`
      - Configuration Options:
        * Minimum confidence threshold: 70%
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
      - Minimum confidence threshold: 75%
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
      - Minimum confidence threshold: 80%

   d. Email Enrichment Module:
      - Purpose: Validate and enrich discovered email addresses
      - Key Features:
        * Deep validation
        * Pattern verification
        * Domain analysis
      - Implementation: `server/lib/search-logic/email-enrichment/`
      - Minimum confidence threshold: 85%

   e. Email Deepdive Module:
      - Purpose: Advanced source analysis and verification
      - Key Features:
        * Local source search
        * Digital platform analysis
        * Cross-reference validation
      - Implementation: `server/lib/search-logic/deep-searches/email-deepdive/`
      - Minimum confidence threshold: 65%


## 5. Confidence Threshold System:

   The application implements a sophisticated confidence threshold system:

   a. Purpose:
      - Ensures high-quality search results
      - Filters out low-confidence matches
      - Provides transparency in search reliability

   b. Implementation:
      - Visual confidence indicators
      - Color-coded thresholds:
        * High (≥85%): Emerald
        * Medium (≥70%): Amber
        * Low (<70%): Red
      - Progress bars showing threshold levels
      - Tooltips explaining confidence requirements

   c. Module-Specific Thresholds:
      - Each search module has its own minimum confidence requirement
      - Thresholds are enforced during result validation
      - Results below threshold are filtered out

   d. User Interface:
      - Interactive confidence displays
      - Real-time threshold visualization
      - Clear feedback on confidence levels
      - Easy configuration through Search Flow UI


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

### Environment Setup
1. Ensure Node.js is installed (handled by Replit)
2. Install dependencies:
   ```bash
   npm install
   ```

### Starting the Application
1. Development server:
   ```bash
   npm run dev