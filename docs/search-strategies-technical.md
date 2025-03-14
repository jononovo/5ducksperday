# Search System Technical Documentation

This document provides a detailed technical breakdown of the search system implemented in the 5 Ducks platform.

## Standard Search Flow

The 5 Ducks platform implements a standard search flow that consists of four sequential modules, each responsible for a specific aspect of the search and discovery process.

**API Calls**: 6-8 total API calls per standard search operation

### Core Modules

The standard search flow consists of these sequential modules:

```
Standard Search Flow: Company Overview → Email Discovery → Enrich Email → Email Deepdive
```

#### 1. Company Overview Module

**API Calls**: 1-2 calls
**Purpose**: Initial company discovery and basic information extraction

**Technical Flow**:
- Parse user query for company names, industry, and location
- Extract basic company information (name, website, size, etc.)
- Discover company domain and website URLs
- Initialize search context with company parameters
- Validate company existence and relevance to query

#### 2. Email Discovery Module

**API Calls**: 2-3 calls
**Purpose**: Identify contact information patterns and potential team members

**Technical Flow**:
- Analyze company website for contact page patterns
- Extract potential team member information from About/Team pages
- Generate candidate email formats based on domain patterns
- Perform MX record verification on the domain
- Apply pattern-based email prediction for discovered contacts

#### 3. Enrich Email Module

**API Calls**: 1-2 calls
**Purpose**: Validate and enhance discovered email information

**Technical Flow**:
- Verify email validity through multiple validation techniques
- Score email confidence based on pattern consistency
- Cross-reference emails with contact information
- Enhance contact records with validation metrics
- Filter low-quality or invalid email addresses

#### 4. Email Deepdive Module

**API Calls**: 2-3 calls
**Purpose**: Advanced email discovery for high-value contacts

**Technical Flow**:
- Focus on high-priority contacts (leadership, decision-makers)
- Apply advanced pattern generation for missing emails
- Perform deeper verification of email validity
- Correlate email data with social profiles when available
- Calculate final confidence scores for emails

### Search Strategies

The platform implements four different search strategies that leverage these modules with different configurations.

## 1. Small Business Contacts Strategy (Default)

**API Calls**: 5-7 total API calls per search operation
**Validation Strategy**: standard
**Default Strategy**: Yes

### Technical Flow:

1. **Query Processing**:
   - Local business-focused query parsing
   - Geographic and industry classification
   - Small business filters (employee size < 100)
   - Prioritize local business discovery

2. **Module Configuration**:
   - Standard implementation of all four core modules
   - Company Overview: Focus on local business directories
   - Email Discovery: Emphasize owner/operator identification
   - Enrich Email: Standard validation with small business patterns
   - Email Deepdive: Limited to 1-2 key decision-makers

3. **Validation Pipeline**:
   - Balanced validation approach (middle threshold: 45%)
   - Required fields: name + (role OR email)
   - Owner/operator role identification boost
   - Geographic relevance scoring

4. **Result Processing**:
   - Balanced quality and quantity approach
   - Favors small business owner/operator contacts
   - Maximum 7 contacts per company
   - Contact categorization by decision-making authority

5. **Practical Implementation Improvements**:
   - Enhanced direct website extraction (About/Team/Contact pages)
   - Added local business directory integration
   - Implemented local business association lookups
   - Applied specialized small business email patterns
   - Increased focus on owner/founder identification
   - Added local search modifiers for improved geographic relevance

## 2. Enhanced Contact Discovery Strategy

**API Calls**: 8-10 total API calls per search operation
**Validation Strategy**: strict

### Technical Flow:

1. **Query Processing**:
   - Parse query with high-precision entity extraction
   - Apply enhanced configuration (minimum score: 65)
   - Initialize search with strict validation parameters

2. **Module Configuration**:
   - Uses all four standard modules with enhanced settings
   - Company Overview: Extended company metadata extraction
   - Email Discovery: Higher precision contact identification
   - Enrich Email: Strict validation requirements
   - Email Deepdive: Focused on quality over quantity

3. **Validation Pipeline**:
   - Minimum confidence threshold: 65%
   - Required fields: name + role + (email OR linkedinUrl)
   - AI-assisted name validation against company context
   - Strict duplicate detection and elimination

4. **Result Processing**:
   - Quality-focused filtering (fewer, better contacts)
   - Standard contact scoring without multipliers
   - Maximum 5 contacts per company

## 3. Comprehensive Search Strategy

**API Calls**: 12-15 total API calls per search operation
**Validation Strategy**: comprehensive

### Technical Flow:

1. **Query Processing**:
   - Full semantic parsing with entity extraction
   - Multi-factor relevance scoring
   - Expanded search context with industry parameters

2. **Module Configuration**:
   - Extended versions of the four standard modules
   - Additional supplementary sources for each module
   - Multi-pass execution with feedback loops

3. **Cross-Validation Pipeline**:
   - Multi-stage verification process
   - Cross-reference validation between sources
   - Confidence scoring with weighted algorithm
   - Required minimum score: 50%

4. **Result Processing**:
   - Tiered contact categorization (A/B/C quality)
   - Source-diversity scoring bonus
   - Maximum 15 contacts per company

## 4. Legacy Search (v1) Strategy

**API Calls**: 6-8 total API calls per search operation
**Validation Strategy**: basic

### Technical Flow:

1. **Query Processing**: 
   - Basic query parsing with company name extraction
   - Legacy configuration with lower thresholds (minimum score: 30)
   - Initialize with legacyMode flag enabled

2. **Module Configuration**:
   - Simplified versions of the standard modules
   - Company Overview: Basic company information only
   - Email Discovery: Focus on leadership team identification
   - Enrich Email: More permissive validation rules
   - Email Deepdive: Prioritizes leadership discovery

3. **Validation Pipeline**:
   - Minimum confidence threshold: 30%
   - Leadership role boost: +20 points
   - Role-specific multipliers:
     - C-level executives: 1.3x score multiplier
     - Founders/owners: 1.5x score multiplier
     - Directors/VPs: 1.2x score multiplier

4. **Result Processing**:
   - Allows partial data (name + role is acceptable)
   - Prioritizes leadership roles with scoring boosts
   - Maximum 10 contacts per company
   - Skip advanced validation checks
   - Focus on quantity with acceptable quality

## Implementation Notes

### Key Configuration Differences

| Parameter | Enhanced | Comprehensive | Legacy |
|-----------|----------|--------------|--------|
| Min. Contact Score | 65 | 50 | 30 |
| Validation Strategy | strict | comprehensive | basic |
| Max Contacts/Company | 5 | 15 | 10 |
| API Calls | 8-10 | 12-15 | 6-8 |
| Leadership Boost | No | Yes (+10) | Yes (+20) |
| Role Multipliers | No | Partial | Yes (1.2-1.5x) |
| Allow Partial Data | No | Limited | Yes |
| Execution Pattern | Sequential | Parallel | Sequential |

### Technical Implementation Details

All strategies leverage the core `SequentialSearchExecutor` infrastructure with different configuration parameters. The executor processes a search sequence that consists of:

```typescript
export interface SearchSequence {
  modules: string[];
  order: string[];
  validationStrategy: "strict" | "comprehensive" | "basic";
}
```

Module execution follows a pipeline pattern with results flowing from one module to the next, allowing for progressive enrichment and validation of discovered contacts.

Validation strategies are implemented via configurable rule sets:

```typescript
const VALIDATION_STRATEGIES = {
  strict: {
    requiredFields: ["name", "role", "email"],
    scoreThresholds: { name: 65, role: 60, email: 70 },
    minimumConfidence: 65,
  },
  comprehensive: {
    requiredFields: ["name", "role"],
    scoreThresholds: { name: 50, role: 50, email: 60 },
    minimumConfidence: 50,
  },
  basic: {
    requiredFields: ["name"],
    scoreThresholds: { name: 30, role: 0, email: 40 },
    minimumConfidence: 30,
    founder_multiplier: 1.5,
    c_level_multiplier: 1.3,
    director_multiplier: 1.2,
  }
};
```