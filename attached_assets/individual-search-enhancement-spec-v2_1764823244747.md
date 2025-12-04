# Technical Specification: Individual Person Search Enhancement

## Project: 5Ducks Lead Generation Platform
## Feature: Multi-Candidate Individual Search
## Version: 2.0 (Simplified)
## Date: December 2025

---

## Executive Summary

Enhance Individual Person Search to return **multiple candidates** instead of one, using Perplexity's Search API. Results display as standard Company+Contact pairs—no UI changes needed.

**What changes:**
- Replace Sonar API with Search API
- Return 3-5 candidates as Company+Contact records
- Rank by match quality (best first)

**What stays the same:**
- Results UI (Company with Contact inside)
- Job status flow (pending → processing → completed)
- Email enrichment flow (user clicks to enrich)
- Credit model

---

## 1. Problem

Current implementation uses Perplexity Sonar which returns **one synthesized answer**. User has no visibility into alternative matches.

**Example:** Search for "Joseph Butler in Manchester, Financial analyst"
- Current: Returns 1 person (might be wrong)
- Proposed: Returns 3-5 candidates ranked by match quality

---

## 2. Solution

### Replace Sonar with Search API

| Current (Sonar) | Proposed (Search API) |
|-----------------|----------------------|
| Single answer | 1-20 ranked results |
| Prose text | Structured JSON |
| Parse name/company | Pre-structured data |

### Flow

```
User Query: "Joseph Butler in Manchester, UK. Financial analyst"
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. PARSE QUERY (existing)                                      │
│     → { personName, locationHint, roleHint }                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. PERPLEXITY SEARCH API (new)                                 │
│     POST https://api.perplexity.ai/search                       │
│     Query: "Joseph Butler" Manchester Financial analyst LinkedIn│
│     Returns: 10 ranked web results                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. PARSE & SCORE RESULTS (new)                                 │
│     For each result:                                            │
│       - Extract name, company, role from title/snippet          │
│       - Score against query (name + location + role match)      │
│       - Keep top 5                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. CREATE RECORDS (modified)                                   │
│     For each candidate:                                         │
│       - Create Company (or "Company Unknown" placeholder)       │
│       - Create Contact with LinkedIn URL                        │
│     Return as standard results                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. DISPLAY (no changes)                                        │
│     Standard results view:                                      │
│       Company 1 (92% match)                                     │
│         └─ Joseph Butler, CFO                                   │
│       Company 2 (78% match)                                     │
│         └─ Joseph Butler, Senior Analyst                        │
│       ...                                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Handling Unknown Companies

If a candidate's current company cannot be determined:

| Scenario | Company Name |
|----------|--------------|
| No company found | "Company Unknown" |
| Explicitly unemployed | "Currently Unemployed" |
| On break/sabbatical | "On Sabbatical" |
| Freelance/Consulting | "Self-Employed" |

The Contact is still created and can be enriched via Apollo using LinkedIn URL.

---

## 4. API Details

### Perplexity Search API

**Request:**
```typescript
POST https://api.perplexity.ai/search
{
  "query": "\"Joseph Butler\" Manchester Financial analyst LinkedIn",
  "max_results": 10,
  "search_domain_filter": ["linkedin.com"]
}
```

**Response:**
```typescript
{
  "results": [
    {
      "title": "Joseph Butler - CFO at Barclays | LinkedIn",
      "url": "https://linkedin.com/in/joseph-butler-cfo",
      "snippet": "Previously Financial Analyst at HSBC Manchester...",
      "score": 0.95
    },
    // ... more results
  ]
}
```

---

## 5. Scoring (Simple)

```typescript
function scoreCandidate(result: SearchResult, query: ParsedQuery): number {
  let score = 0;
  
  // Name in title? (+40)
  if (result.title.toLowerCase().includes(query.personName.toLowerCase())) {
    score += 40;
  }
  
  // Location in snippet? (+25)
  if (query.locationHint && result.snippet.toLowerCase().includes(query.locationHint.toLowerCase())) {
    score += 25;
  }
  
  // Role in snippet? (+25)
  if (query.roleHint && result.snippet.toLowerCase().includes(query.roleHint.toLowerCase())) {
    score += 25;
  }
  
  // API relevance (+10)
  score += (result.score || 0) * 10;
  
  return Math.min(100, score);
}
```

---

## 6. Parsing LinkedIn Results

Extract from search result:

```typescript
function parseLinkedInResult(result: SearchResult): ParsedCandidate {
  // Title format: "Joseph Butler - CFO at Barclays | LinkedIn"
  const titleMatch = result.title.match(/^(.+?)\s*[-–]\s*(.+?)\s+at\s+(.+?)\s*\|/i);
  
  if (titleMatch) {
    return {
      name: titleMatch[1].trim(),
      role: titleMatch[2].trim(),
      company: titleMatch[3].trim(),
      linkedinUrl: result.url,
      snippet: result.snippet
    };
  }
  
  // Fallback: just extract name
  return {
    name: result.title.split(/[-–|]/)[0].trim(),
    role: null,
    company: null,  // Will become "Company Unknown"
    linkedinUrl: result.url,
    snippet: result.snippet
  };
}
```

---

## 7. File Changes

### New Files

| File | Purpose |
|------|---------|
| `server/search/individual/perplexity-search-api.ts` | Search API client |

### Modified Files

| File | Changes |
|------|---------|
| `server/search/individual/individual-search-service.ts` | Use Search API, create multiple records |
| `server/search/individual/types.ts` | Add `ParsedCandidate` type |

### No Changes Needed

- Frontend components
- Job status flow
- Credit system
- Results display
- Email enrichment

---

## 8. Implementation

### perplexity-search-api.ts

```typescript
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export async function searchForPerson(
  name: string,
  locationHint?: string,
  roleHint?: string
): Promise<SearchResult[]> {
  const queryParts = [`"${name}"`];
  if (locationHint) queryParts.push(locationHint);
  if (roleHint) queryParts.push(roleHint);
  queryParts.push('LinkedIn');
  
  const response = await fetch('https://api.perplexity.ai/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: queryParts.join(' '),
      max_results: 10,
      search_domain_filter: ['linkedin.com']
    })
  });
  
  const data = await response.json();
  return data.results || [];
}
```

### Modified individual-search-service.ts

```typescript
static async executeIndividualJob(job: SearchJob, jobId: string): Promise<void> {
  // 1. Parse query (existing)
  const parsed = parseIndividualQuery(job.query);
  
  // 2. Search for candidates (NEW)
  const searchResults = await searchForPerson(
    parsed.personName,
    parsed.locationHint,
    parsed.roleHint
  );
  
  if (searchResults.length === 0) {
    // No results - mark job failed with helpful message
    await storage.updateSearchJob(job.id, {
      status: 'completed',
      results: {
        companies: [],
        contacts: [],
        searchType: 'individual',
        metadata: { message: 'No candidates found. Try adding more context.' }
      }
    });
    return;
  }
  
  // 3. Parse and score candidates (NEW)
  const candidates = searchResults
    .map(result => ({
      ...parseLinkedInResult(result),
      score: scoreCandidate(result, parsed)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);  // Top 5
  
  // 4. Create Company + Contact for each candidate
  const companiesWithContacts = [];
  
  for (const candidate of candidates) {
    // Create company (or placeholder)
    const companyData = {
      userId: job.userId,
      name: candidate.company || 'Company Unknown',
      website: null,
      description: candidate.snippet,
      listId: (job.metadata as any)?.listId || null
    };
    const company = await storage.createCompany(companyData);
    
    // Create contact
    const contactData = {
      userId: job.userId,
      companyId: company.id,
      name: candidate.name,
      role: candidate.role,
      linkedinUrl: candidate.linkedinUrl,
      probability: candidate.score
    };
    const contact = await storage.createContact(contactData);
    
    companiesWithContacts.push({
      ...company,
      contacts: [contact]
    });
  }
  
  // 5. Deduct credits
  await CreditService.deductCredits(job.userId, 'individual_search', true);
  
  // 6. Complete job with results
  await storage.updateSearchJob(job.id, {
    status: 'completed',
    completedAt: new Date(),
    results: {
      companies: companiesWithContacts,
      contacts: companiesWithContacts.flatMap(c => c.contacts),
      totalCompanies: companiesWithContacts.length,
      totalContacts: companiesWithContacts.length,
      searchType: 'individual'
    },
    resultCount: companiesWithContacts.length
  });
}
```

---

## 9. Results Display

No UI changes. Results appear as:

```
┌─────────────────────────────────────────────────────────────┐
│  Barclays                                                   │
│  ─────────────────────────────────────────────────────────  │
│  "Previously Financial Analyst at HSBC Manchester..."       │
│                                                             │
│  👤 Joseph Butler                                           │
│     CFO                                          92% match  │
│     [Find Email]                                            │
├─────────────────────────────────────────────────────────────┤
│  PwC                                                        │
│  ─────────────────────────────────────────────────────────  │
│  "Based in Manchester, financial services..."               │
│                                                             │
│  👤 Joseph Butler                                           │
│     Senior Analyst                               78% match  │
│     [Find Email]                                            │
├─────────────────────────────────────────────────────────────┤
│  Company Unknown                                            │
│  ─────────────────────────────────────────────────────────  │
│  "Freelance consultant, previously at..."                   │
│                                                             │
│  👤 Joe Butler                                              │
│     Consultant                                   65% match  │
│     [Find Email]                                            │
└─────────────────────────────────────────────────────────────┘
```

User clicks "Find Email" on whichever contact is correct → Apollo enrichment runs.

---

## 10. Edge Cases

| Case | Handling |
|------|----------|
| 0 results from Search API | Show message: "No candidates found" |
| All results low score (<30%) | Still show them, user decides |
| Duplicate companies | Allow duplicates (different people at same company) |
| LinkedIn URL parsing fails | Create contact without LinkedIn, Apollo may still find by name |

---

## 11. Cost

| Component | Cost |
|-----------|------|
| Perplexity Search API | $0.005 per search |
| Apollo enrichment | Existing cost (per contact enriched) |

Same as before, just better results.

---

## 12. Implementation Time

| Task | Hours |
|------|-------|
| Search API client | 1 |
| Result parsing | 2 |
| Scoring logic | 1 |
| Modify IndividualSearchService | 2 |
| Testing | 2 |
| **Total** | **~8 hours** |

---

## 13. Summary

**Before:** 1 result, might be wrong, no alternatives shown

**After:** 3-5 results ranked by match quality, user picks correct one

**Changes:**
- 1 new file (Search API client)
- 1 modified file (IndividualSearchService)
- No UI changes
- No new endpoints
- No new job statuses

**Same experience, better results.**
