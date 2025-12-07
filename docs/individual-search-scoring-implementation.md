# Individual Search Scoring Model Implementation

## Overview

This document explains how to implement the structured individual search scoring model that uses hard name filters and context-based ranking.

## Scoring Model

| Factor | Points | Type |
|--------|--------|------|
| Last name match | N/A | HARD FILTER (exclude if no match) |
| First name exact | 85 pts | HARD FILTER + scored |
| First name nickname | 75 pts | HARD FILTER + scored |
| Company context | +5 pts | Bonus |
| Role context | +5 pts | Bonus |
| Other context | +5 pts | Bonus |
| **Maximum** | **100 pts** | |

## File to Modify

`server/search/individual/claude-extraction.ts`

## Implementation

### 1. Update `buildStructuredPrompt()` Function

Replace the prompt construction with:

```typescript
function buildStructuredPrompt(structuredSearch: StructuredSearchData, searchResultsText: string): string {
  const nameParts = structuredSearch.fullName.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];
  
  return `You are analyzing web search results to find people with a specific name.

SEARCH TARGET:
- Full Name: "${structuredSearch.fullName}"
  - First Name: "${firstName}"
  - Last Name: "${lastName}"
${structuredSearch.company ? `- Context Company: "${structuredSearch.company}"` : ''}
${structuredSearch.role ? `- Context Role: "${structuredSearch.role}"` : ''}
${structuredSearch.location ? `- Context Location: "${structuredSearch.location}"` : ''}
${structuredSearch.knownEmail ? `- Known Email: "${structuredSearch.knownEmail}"` : ''}
${structuredSearch.otherContext ? `- Additional Context: "${structuredSearch.otherContext}"` : ''}

SEARCH RESULTS:
${searchResultsText}

MANDATORY NAME FILTERS (candidates without BOTH are EXCLUDED - never show them):
1. Last name MUST be "${lastName}" exactly (case insensitive) - NO EXCEPTIONS
2. First name MUST be "${firstName}" OR a recognized nickname variation

Recognized nicknames: Mike=Michael, Bob=Robert, Rob=Robert, Will=William, Bill=William, Jim=James, Jimmy=James, Tim=Timothy, Tom=Thomas, Dick=Richard, Rick=Richard, Tony=Anthony, Joe=Joseph, Dan=Daniel, Dave=David, Steve=Steven, Chris=Christopher, Matt=Matthew, Nick=Nicholas, Sam=Samuel, Ben=Benjamin, Alex=Alexander, Andy=Andrew, Ed=Edward, Ted=Edward, Jack=John, etc.

SCORING (only for candidates that pass BOTH name filters):
- First name EXACT match ("${firstName}" = "${firstName}"): 85 points
- First name NICKNAME match (e.g., Mike matching Michael): 75 points
- Company context match: +5 points (if matches "${structuredSearch.company || 'N/A'}")
- Role context match: +5 points (if matches "${structuredSearch.role || 'N/A'}")
- Other context match: +5 points (location, industry, or other context matches)

Maximum score: 100 points (85 + 5 + 5 + 5)

CRITICAL RULES:
1. NEVER include anyone with a different last name than "${lastName}" - EXCLUDE them completely
2. NEVER include anyone with a different first name (unless it's a recognized nickname of "${firstName}")
3. Return 3-5 results ranked by score (highest first)
4. Same person at multiple companies = multiple results (current role + previous roles)
5. Use "Unknown" for missing company/role - NEVER leave blank

Return ONLY valid JSON:
{
  "searchContext": {
    "interpretedName": "${structuredSearch.fullName}",
    "interpretedCompany": ${structuredSearch.company ? `"${structuredSearch.company}"` : 'null'},
    "interpretedRole": ${structuredSearch.role ? `"${structuredSearch.role}"` : 'null'},
    "interpretedLocation": ${structuredSearch.location ? `"${structuredSearch.location}"` : 'null'}
  },
  "candidates": [
    {
      "name": "Full Name",
      "currentCompany": "Company Name",
      "currentRole": "Job Title",
      "companyWebsite": "https://...",
      "linkedinUrl": "https://linkedin.com/in/...",
      "score": 100,
      "reasoning": "First name 'Tim' matches exactly (+85), company Apple matches (+5), role CEO matches (+5), location California matches (+5) = 100 pts"
    }
  ]
}`;
}
```

### 2. Update Fallback Prompt (for non-structured queries)

In the same file, update the fallback prompt in `extractCandidatesWithClaude()`:

```typescript
const prompt = structuredSearch 
  ? buildStructuredPrompt(structuredSearch, searchResultsText)
  : `You are analyzing web search results to find people matching a user's query.

ORIGINAL QUERY: "${originalQuery}"

SEARCH RESULTS:
${searchResultsText}

TASK:
1. First, interpret what the user is looking for from their query:
   - Person's name (first name + last name required)
   - Company context (if mentioned, look for "at [company]")
   - Role context (if mentioned)
   - Location context (if mentioned, look for "in [city]" or city names like NYC, London, etc.)

2. Find people with the EXACT same name (first AND last name must match).

MANDATORY NAME FILTERS (candidates without BOTH are EXCLUDED - never show them):
1. Last name MUST match exactly (case insensitive) - NO EXCEPTIONS
2. First name MUST match exactly OR be a recognized nickname variation

Recognized nicknames: Mike=Michael, Bob=Robert, Rob=Robert, Will=William, Bill=William, Jim=James, Jimmy=James, Tim=Timothy, Tom=Thomas, Dick=Richard, Rick=Richard, Tony=Anthony, Joe=Joseph, Dan=Daniel, Dave=David, Steve=Steven, Chris=Christopher, Matt=Matthew, Nick=Nicholas, Sam=Samuel, Ben=Benjamin, Alex=Alexander, Andy=Andrew, Ed=Edward, Ted=Edward, Jack=John, etc.

SCORING (only for candidates that pass BOTH name filters):
- First name EXACT match: 85 points
- First name NICKNAME match: 75 points
- Company context match: +5 points
- Role context match: +5 points
- Other context match: +5 points (location, industry, etc.)

Maximum score: 100 points (85 + 5 + 5 + 5)

RULES:
- NEVER include anyone with a different last name - EXCLUDE them completely
- NEVER include anyone with a different first name (unless recognized nickname)
- Return 3-5 results ranked by score (highest first)
- Same person at multiple companies = multiple results
- Use "Unknown" for missing company or role - NEVER leave blank

Return ONLY valid JSON in this exact format:
{
  "searchContext": {
    "interpretedName": "The person's name from query",
    "interpretedCompany": "Company context from query or null",
    "interpretedRole": "Role context from query or null",
    "interpretedLocation": "Location context from query or null"
  },
  "candidates": [
    {
      "name": "Full Name",
      "currentCompany": "Company Name",
      "currentRole": "Job Title",
      "companyWebsite": "https://...",
      "linkedinUrl": "https://linkedin.com/in/...",
      "score": 100,
      "reasoning": "First name 'Tim' matches exactly (+85), company matches (+5), role matches (+5), location matches (+5) = 100 pts"
    }
  ]
}`;
```

## Key Changes Summary

1. **Last name is now a hard filter** - Not scored, just excluded if no match
2. **First name scoring changed** - 85 pts exact, 75 pts nickname (was 10/5)
3. **Context scoring reduced** - 5 pts each (was 15-20 each)
4. **Explicit exclusion language** - "NEVER include anyone with different last name"
5. **Nickname list added** - Comprehensive list for Claude reference

## Expected Behavior

- All results have identical last name
- All results have matching first name (exact or nickname)
- Results ranked by context relevance (company, role, location)
- Same person at different companies = multiple results

## Testing

Search for "Tim Cook" with context "CEO, Apple, California":
- Expected: All results named "Tim Cook" or "Timothy Cook"
- Top result: Tim Cook at Apple (CEO) with score ~100
- Other results: Lower scores based on context match
