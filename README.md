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