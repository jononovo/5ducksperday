# Search Flow Documentation - May 30, 2025

This document provides a complete technical analysis of the actual search flow executed when the search button is clicked on the main search page.

## Overview

**Total API Calls**: 4-6 Perplexity API requests per search
**Model Used**: `llama-3.1-sonar-small-128k-online`
**API Configuration**: 
- Temperature: 0.2
- Max Tokens: 1000
- Stream: false

## Complete Search Flow

### 1. Initial Company Discovery

**Function**: `searchCompanies()`  
**File**: `server/lib/search-logic.ts`  
**Execution**: Always runs (unless cached)

**System Prompt**:
```
Be precise and concise. Website: Only include the official domain, otherwise leave empty.
```

**User Prompt**:
```
Find companies that match this criteria: [USER_QUERY]. 
Please output a JSON array containing 7 objects, where each object has exactly three fields:
"name" (the company name),
"website" (the company's official domain), and
"description" (a 1-2 sentence description of what the company does).
```

**Expected Output Structure**:
```json
[
  {
    "name": "Company Name",
    "website": "domain.com", 
    "description": "Brief description of what the company does"
  }
]
```

**Fallback Processing**: Multiple regex-based extraction methods if JSON parsing fails

---

### 2. Company Overview Analysis

**Function**: `analyzeCompany()`  
**File**: `server/routes.ts` (lines 1084-1089)  
**Execution**: Always runs for each company

**System Prompt**:
```
[COMPANY_OVERVIEW.TECHNICAL_PROMPT] 
OR (if null): "You are a business intelligence analyst providing detailed company information."
```

**User Prompt Template**:
```
Based on initial company search for "[ORIGINAL_QUERY]", we found:
Company: [COMPANY_NAME]
Website: [COMPANY_WEBSITE OR 'Not available']
Description: [COMPANY_DESCRIPTION OR 'Not available']

[COMPANY_OVERVIEW.PROMPT]

Use the search context and company details above to inform your analysis.
```

**Response Structure** (if specified):
```
[COMPANY_OVERVIEW.RESPONSE_STRUCTURE]
```

**Default Analysis Targets**:
- Company size (employee count)
- Services offered
- Location/headquarters
- Year founded
- Market position
- Industry classification

---

### 3. Decision Maker Analysis (Conditional)

**Function**: `analyzeCompany()`  
**File**: `server/routes.ts` (lines 1105-1110)  
**Execution**: Only if `decisionMakerAnalysis?.active` is true

**System Prompt**:
```
[DECISION_MAKER_ANALYSIS.TECHNICAL_PROMPT] 
OR (if null): "You are a business intelligence analyst providing detailed company information."
```

**User Prompt Template**:
```
Based on initial company search for "[ORIGINAL_QUERY]", we found:
Company: [COMPANY_NAME]
Website: [COMPANY_WEBSITE OR 'Not available']
Description: [COMPANY_DESCRIPTION OR 'Not available']

[DECISION_MAKER_ANALYSIS.PROMPT]

Use the search context and company details above to find the most relevant decision makers.
```

**Response Structure** (if specified):
```
[DECISION_MAKER_ANALYSIS.RESPONSE_STRUCTURE]
```

---

### 4. Enhanced Contact Discovery

**Function**: `findKeyDecisionMakers()`  
**File**: `server/lib/search-logic/contact-discovery/enhanced-contact-finder.ts`  
**Execution**: Always runs with these options:
```javascript
{
  industry: industry,
  minimumConfidence: 30,
  maxContacts: 15,
  includeMiddleManagement: true,
  prioritizeLeadership: true,
  useMultipleQueries: true
}
```

#### 4a. Core Leadership Search

**Function**: `searchCoreLeadership()`  
**Execution**: Always runs

**System Prompt**:
```
You are an expert in identifying key leadership personnel at companies. 
Your task is to identify the leadership team members at the specified company.
```

**User Prompt Template**:
```
Identify the core leadership team at [COMPANY_NAME]. Focus on:
1. C-level executives (CEO, CTO, CFO, COO, etc.)
2. Founders and co-founders
3. Board members and directors
4. Division/department heads

For each person, provide their:
- Full name (first and last name)
- Current role/position

IMPORTANT: If you cannot find data, return an empty array. Do NOT make up data.

[IF INDUSTRY DETECTED]:
This company is in the [INDUSTRY] industry. Focus on industry-specific leadership roles.
```

**Expected Output Structure**:
```json
{ 
  "leaders": [
    {
      "name": "John Smith", 
      "role": "Chief Executive Officer"
    }
  ]
}
```

#### 4b. Department Heads Search

**Function**: `searchDepartmentHeads()`  
**Execution**: Runs if `useMultipleQueries: true`

**System Prompt**:
```
You are an expert in identifying department leaders at companies.
Your task is to identify key people leading various departments at the specified company.
```

**User Prompt Template**:
```
Identify the key department leaders at [COMPANY_NAME]. Focus on these departments:
[INDUSTRY_SPECIFIC_DEPARTMENTS OR DEFAULT_DEPARTMENTS]

[IF INDUSTRY CONTEXT]:
This company is in the [INDUSTRY] industry. Focus on industry-specific department leaders.

For each person, provide their:
- Full name (first and last name)
- Current role/position

IMPORTANT: If you cannot find data, return an empty array. Do NOT make up data.
```

**Department Focus by Industry**:
- **Technology**: Engineering, Product Management, Customer Success, Data Science, UX/Design
- **Healthcare**: Medical Affairs, Clinical Operations, Patient Services, Regulatory Affairs
- **Financial**: Investment Banking, Asset Management, Risk Management, Trading
- **Default**: Engineering/IT, Sales, Marketing, Finance, Operations, HR, Product Management

**Expected Output Structure**:
```json
{ 
  "departmentLeaders": [
    {
      "name": "Jane Doe", 
      "role": "Head of Marketing"
    }
  ]
}
```

#### 4c. Middle Management Search

**Function**: `searchMiddleManagement()`  
**Execution**: Runs if `includeMiddleManagement: true`

**System Prompt**:
```
You are an expert in identifying influential middle managers and technical leaders at companies.
Your task is to identify key people who make important decisions but may not be in the C-suite.
```

**User Prompt Template**:
```
Identify important middle managers and key technical leaders at [COMPANY_NAME]. Focus on:
1. Team leads
2. Senior managers
3. Project managers
4. Technical specialists with authority
5. Key decision-makers below C-level

For each person, provide their:
- Full name (first and last name)
- Current role/position

IMPORTANT: If you cannot find data, return an empty array. Do NOT make up data.

[IF INDUSTRY CONTEXT]:
This company is in the [INDUSTRY] industry. Focus especially on these roles:
[INDUSTRY_SPECIFIC_ROLES]
```

**Expected Output Structure**:
```json
{ 
  "managers": [
    {
      "name": "Alice Johnson", 
      "role": "Senior Product Manager"
    }
  ]
}
```

---

## Data Processing Pipeline

### Contact Extraction and Validation
1. **Standard Extraction**: Uses `extractContacts()` to parse analysis results
2. **Enhanced Discovery**: Results from `findKeyDecisionMakers()` 
3. **Deduplication**: Filters duplicates by name (case-insensitive)
4. **Confidence Filtering**: Removes contacts below 35% probability
5. **Database Storage**: Creates contact records with validation metadata

### Industry Detection
Automatic detection based on company services/description:
- **Technology**: software, tech, development, IT, programming, cloud
- **Healthcare**: healthcare, medical, hospital, doctor
- **Financial**: finance, banking, investment
- **Construction**: construction, building, real estate
- **Legal**: legal, law, attorney
- **Retail**: retail, shop, store
- **Education**: education, school, university

### Caching Strategy
- **Cache Key**: `search_${base64(query)}_companies`
- **TTL**: 5 minutes
- **Cached Data**: Both API results and created database records
- **Reuse Logic**: Quick search populates cache, full search consumes it

---

## Response Format

**Final API Response**:
```json
{
  "companies": [
    {
      "id": 1234,
      "name": "Company Name",
      "website": "domain.com",
      "description": "Company description",
      "contacts": [
        {
          "id": 5678,
          "name": "John Smith",
          "role": "CEO",
          "email": null,
          "probability": 85,
          "verificationSource": "Decision-maker Analysis"
        }
      ]
    }
  ],
  "query": "original search query",
  "strategyId": 123,
  "strategyName": "Strategy Name"
}
```

---

## Technical Notes

- **Error Handling**: Multiple fallback extraction methods for robust parsing
- **Rate Limiting**: No explicit rate limiting implemented
- **Authentication**: Uses Firebase authentication with fallback to demo user (ID: 1)
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Name validation, email pattern checking, role confidence scoring

This represents the complete, actual search flow executed when users click the search button.