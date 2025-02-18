server/
   ├── storage/
   │   └── search.ts       # Database operations
   └── lib/
       └── search-logic/   # Search implementation
           ├── deep-searches/     # Specialized searches
           ├── email-discovery/   # Email-specific logic
           └── shared/           # Common utilities
   ```

4. Module Types and Their Functions:

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

   d. Additional Email Module (formerly Email Enrichment):
       - Purpose: Discover and validate professional email addresses
       - Key Features:
         * Pattern-based email discovery
         * Multi-source validation
         * Confidence scoring
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

5. Confidence Threshold System:

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


# Database Architecture & Migration Guide

## Database Architecture

1. Schema Definition:
   ```typescript
   shared/
   └── schema.ts   # Central schema definitions using Drizzle ORM
   ```

2. Storage Layer:
   ```
   server/
   ├── storage/
   │   ├── search.ts       # Search-related database operations
   │   ├── companies.ts    # Company-related database operations
   │   ├── contacts.ts     # Contact-related database operations
   │   └── database.ts     # Database connection and initialization
   ```

3. Database Models:
   - Companies: Business entity information
   - Contacts: Professional contact details
   - Search Approaches: Search configuration and logic
   - Campaigns: Marketing campaign management
   - Lists: Company and contact groupings
   - Email Templates: Communication templates

## Database Operations Guide

### Adding New Tables

1. Update Schema:
   - Add new models in `shared/schema.ts`
   - Use Drizzle's type-safe schema definitions
   - Example:
     ```typescript
     export const newTable = pgTable("table_name", {
       id: serial("id").primaryKey(),
       field: text("field").notNull()
     });
     ```

2. Create Types:
   - Define insert schema using `createInsertSchema`
   - Create select type using `$inferSelect`
   - Example:
     ```typescript
     export const insertSchema = createInsertSchema(newTable);
     export type SelectType = typeof newTable.$inferSelect;
     ```

3. Update Storage:
   - Add corresponding methods in appropriate storage file
   - Implement CRUD operations using Drizzle ORM
   - Follow existing patterns in `server/storage/`

### Updating Existing Tables

1. Modify Schema:
   - Update the table definition in `shared/schema.ts`
   - Add new columns or modify existing ones
   - Example:
     ```typescript
     // Adding a new column
     newColumn: text("new_column").notNull()
     ```

2. Push Changes:
   ```bash
   npm run db:push
   ```
   Note: If you receive a data loss warning, either:
   - Modify the schema to prevent data loss
   - Or use the SQL tool to manually handle the data

### Database Migrations

- NEVER write manual SQL migrations
- Always use Drizzle's schema-push functionality
- Command: `npm run db:push`

### Best Practices

1. Schema Organization:
   - Keep all schemas in `shared/schema.ts`
   - Group related tables together
   - Add clear comments for complex relations

2. Type Safety:
   - Always use Zod schemas for validation
   - Leverage Drizzle's type inference
   - Define explicit types for all database operations

3. Error Handling:
   - Implement proper error catching
   - Use typed error responses
   - Log database errors appropriately

4. Performance:
   - Use appropriate indexes
   - Optimize queries using Drizzle's query builder
   - Consider batch operations for bulk updates

## Default Data Initialization

The application automatically initializes default data:
- Search approaches through `SearchStorage.initializeDefaultSearchApproaches()`
- Email templates via `TemplateStorage.initializeDefaultEmailTemplates()`

To customize initialization:
1. Modify default data arrays in storage classes
2. Update initialization logic in `storage/database.ts`

## Development Setup

1. Database Setup:
   - PostgreSQL database is automatically provisioned
   - Connection URL available in DATABASE_URL environment variable

2. Development Workflow:
   ```bash
   npm run dev    # Starts the development server