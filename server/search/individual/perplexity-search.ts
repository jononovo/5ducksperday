import type { CandidateResult } from './types';

interface PerplexitySearchResponse {
  results?: Array<{
    title: string;
    url: string;
    snippet: string;
    date?: string;
  }>;
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Simplified AI-driven candidate search.
 * Takes raw user query, searches the web, and extracts structured candidates in one step.
 * The AI handles all parsing/interpretation of the query - no regex needed.
 */
export async function searchAndExtractCandidates(rawQuery: string): Promise<{
  candidates: CandidateResult[];
  searchContext: {
    interpretedName: string;
    interpretedCompany?: string;
    interpretedRole?: string;
    interpretedLocation?: string;
  };
}> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('Perplexity API key is not configured');
  }

  console.log(`[PerplexitySearch] Searching for: "${rawQuery}"`);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: `You are a professional researcher helping find people for B2B outreach.

TASK: Search for and identify candidates matching the user's query.

STEP 1 - INTERPRET THE QUERY:
First, understand what the user is looking for. Parse the query to identify:
- Person's name (required)
- Company they work at (if mentioned)
- Their role/title (if mentioned)
- Their location (if mentioned)

STEP 2 - SEARCH AND EXTRACT CANDIDATES:
Find matching professionals from web search results. For each candidate, extract:
- Full name
- Current company
- Current role/title
- Company website
- LinkedIn URL (if found)

SCORING (0-100):
- Name match: Exact = 40 pts, Partial = 20 pts
- Company match: Exact = 30 pts, Related = 15 pts
- Role match: Same field = 15 pts
- Location match: Same region = 15 pts

RULES:
1. Return 3-5 candidates maximum, sorted by score (highest first)
2. Deduplicate: merge info if same person appears multiple times
3. Only return real professionals you find evidence of
4. If company is unknown, use "Unknown"

RETURN FORMAT (JSON only):
{
  "searchContext": {
    "interpretedName": "The person's name from the query",
    "interpretedCompany": "Company from query or null",
    "interpretedRole": "Role/title from query or null", 
    "interpretedLocation": "Location from query or null"
  },
  "candidates": [
    {
      "name": "Full Name",
      "currentCompany": "Company Name",
      "currentRole": "Job Title",
      "companyWebsite": "https://...",
      "linkedinUrl": "https://linkedin.com/in/...",
      "score": 85,
      "reasoning": "Brief explanation"
    }
  ]
}`
          },
          {
            role: 'user',
            content: `Find candidates matching this query: "${rawQuery}"

Return JSON with searchContext and candidates.`
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false,
        return_related_questions: false,
        search_recency_filter: 'year'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PerplexitySearch] API error: ${response.status} - ${errorText}`);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json() as PerplexitySearchResponse;
    
    const defaultSearchContext = {
      interpretedName: rawQuery.split(/\s+at\s+/i)[0].trim() || rawQuery.split(' ').slice(0, 2).join(' '),
      interpretedCompany: rawQuery.match(/\bat\s+([A-Za-z0-9\s&]+)/i)?.[1]?.trim(),
      interpretedRole: undefined,
      interpretedLocation: undefined
    };

    if (data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      console.log(`[PerplexitySearch] Raw response length: ${content.length} chars`);
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]) as {
            searchContext?: {
              interpretedName?: string;
              interpretedCompany?: string;
              interpretedRole?: string;
              interpretedLocation?: string;
            };
            candidates?: CandidateResult[];
          };
          
          const searchContext = {
            interpretedName: result.searchContext?.interpretedName || defaultSearchContext.interpretedName,
            interpretedCompany: result.searchContext?.interpretedCompany || defaultSearchContext.interpretedCompany,
            interpretedRole: result.searchContext?.interpretedRole,
            interpretedLocation: result.searchContext?.interpretedLocation
          };
          
          const candidates = (result.candidates || [])
            .filter(c => c && c.name && c.currentCompany)
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 5);
          
          console.log(`[PerplexitySearch] Interpreted query:`, searchContext);
          console.log(`[PerplexitySearch] Extracted ${candidates.length} candidates`);
          
          return { searchContext, candidates };
        }
      } catch (parseError) {
        console.error('[PerplexitySearch] Failed to parse JSON:', parseError);
      }
    }

    console.log('[PerplexitySearch] No valid results found, using defaults');
    return {
      searchContext: defaultSearchContext,
      candidates: []
    };

  } catch (error) {
    console.error('[PerplexitySearch] Search error:', error);
    throw error;
  }
}

