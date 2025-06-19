# Search Flow Implementation

## Core Search Modules

The 5 Ducks platform implements a structured search system with four sequential core modules:

1. **Company Overview Module**
   - Responsible for company data collection and analysis
   - Identifies company size, services, market position, etc.
   - Creates baseline company records for further processing
   
2. **Email Discovery Module**
   - Discovers contacts and email addresses associated with the company
   - Performs first-level validation of contact information
   - Generates potential email patterns based on company domain
   
3. **Email Enrichment Module**
   - Validates and enhances email addresses with detailed checks
   - Performs business domain validation, pattern validation, and format checks
   - Assigns confidence scores based on multiple validation metrics
   
4. **Email Deepdive Module**
   - Provides advanced analysis for high-value contacts
   - Prioritizes leadership roles with role-specific weighting
   - Performs deep pattern analysis and domain verification

## Module Sequence

The search system executes these modules in sequence for optimal results:

```
Company Overview → Email Discovery → Email Enrichment → Email Deepdive
```

Each module builds upon the results of the previous one, creating a comprehensive search pipeline.

## Implementation Details

### Module Configuration

Each module has standardized configuration:
- `type`: Unique identifier for the module
- `defaultPrompt`: Human-readable prompt for the search
- `technicalPrompt`: Detailed prompt for the AI system
- `responseStructure`: Expected data format for responses
- `validationRules`: Rules for validating search results

### Search Module Classes

Each module is implemented as a class that implements the `SearchModule` interface:

```typescript
export interface SearchModule {
  execute(context: SearchModuleContext): Promise<SearchModuleResult>;
  validate(result: SearchModuleResult): Promise<boolean>;
  merge?(current: SearchModuleResult, previous?: SearchModuleResult): SearchModuleResult;
}
```

### Key Validation Strategies

#### Email Validation
- Pattern validation (checks format and structure)
- Business domain validation (filters generic/free email providers)
- Placeholder check (filters common generic addresses)

#### Role-Based Prioritization
- Founders/Owners: 1.5x confidence multiplier
- C-level executives: 1.3x confidence multiplier
- Directors/VPs: 1.2x confidence multiplier

## Search Strategies Configuration

The system implements multiple search strategies that leverage different configurations of these core modules:

1. **Small Business Contacts Strategy**
   - Default strategy for most searches
   - Balanced approach for discovering contacts
   - 5-7 API calls per search operation

2. **Enterprise Decision Makers Strategy**
   - Focus on leadership roles in larger companies
   - Higher threshold for contact validation
   - 7-9 API calls per search operation

3. **Maximum Coverage Strategy**
   - Optimized for discovering all possible contacts
   - Lower validation thresholds for initial discovery
   - 8-10 API calls per search operation

4. **Verified Contact Strategy**
   - Highest validation requirements
   - Multiple cross-reference checks
   - 6-8 API calls per search operation

Each strategy configures the modules with different parameters to achieve its specific goals.