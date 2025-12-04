import type { SearchResult } from './perplexity-search-api';
import type { CandidateResult } from './types';

export interface ExtractionResult {
  searchContext: {
    interpretedName: string;
    interpretedCompany?: string;
    interpretedRole?: string;
    interpretedLocation?: string;
  };
  candidates: CandidateResult[];
}

interface PerplexityResponse {
  choices?: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function extractCandidatesWithSonar(
  originalQuery: string,
  searchResults: SearchResult[]
): Promise<ExtractionResult> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    console.error('[SonarExtraction] Perplexity API key is not configured');
    throw new Error('Perplexity API key is not configured. Please add PERPLEXITY_API_KEY to enable individual search extraction.');
  }

  console.log(`[SonarExtraction] Extracting candidates from ${searchResults.length} search results`);

  const searchResultsText = searchResults
    .map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}\n`)
    .join('\n');

  const prompt = `You are analyzing web search results to find professionals matching a user's query.

ORIGINAL QUERY: "${originalQuery}"

SEARCH RESULTS:
${searchResultsText}

TASK:
1. First, interpret what the user is looking for from their query:
   - Person's name (required)
   - Company they work at (if mentioned, look for "at [company]")
   - Their role/title (if mentioned)
   - Their location (if mentioned, look for "in [city]" or city names like NYC, London, etc.)

2. Extract 3-5 DISTINCT candidates from the search results that match the query.
   - Look for LinkedIn profiles, company pages, news articles mentioning real people
   - Each candidate should be a DIFFERENT person (not the same person from different sources)
   - If location was specified (e.g., "in NYC"), prioritize candidates in that location

3. Score each candidate (0-100) based on:
   - Name match: Exact = 30 pts, Partial = 15 pts
   - Company match: Exact = 25 pts, Related = 10 pts
   - Role match: Same field = 20 pts
   - Location match: Same city = 25 pts, Same region = 15 pts

RULES:
- Return AT LEAST 3 candidates when possible (up to 5)
- Use "Unknown" for missing company or role - NEVER leave blank
- Only include candidates you found evidence of in the search results
- If location is in the query, you MUST include it in interpretedLocation

Return ONLY valid JSON in this exact format:
{
  "searchContext": {
    "interpretedName": "The person's name from query",
    "interpretedCompany": "Company from query or null",
    "interpretedRole": "Role from query or null",
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
      "reasoning": "Brief explanation of why this matches"
    }
  ]
}`;

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
            content: 'You are a professional researcher extracting candidate information from search results. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[SonarExtraction] API error: ${response.status} - ${errorText}`);
      throw new Error(`Perplexity Sonar API error: ${response.status}`);
    }

    const data = await response.json() as PerplexityResponse;
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[SonarExtraction] No content in response');
      return getDefaultResult(originalQuery);
    }

    console.log(`[SonarExtraction] Raw response length: ${content.length} chars`);

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[SonarExtraction] No JSON found in response');
        return getDefaultResult(originalQuery);
      }

      const result = JSON.parse(jsonMatch[0]) as ExtractionResult;
      
      const searchContext = {
        interpretedName: result.searchContext?.interpretedName || extractNameFromQuery(originalQuery),
        interpretedCompany: result.searchContext?.interpretedCompany || undefined,
        interpretedRole: result.searchContext?.interpretedRole || undefined,
        interpretedLocation: result.searchContext?.interpretedLocation || undefined
      };

      const candidates = (result.candidates || [])
        .filter(c => c && c.name)
        .map(c => ({
          ...c,
          currentCompany: c.currentCompany || 'Unknown',
          currentRole: c.currentRole || 'Unknown',
          score: c.score || 50
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      console.log(`[SonarExtraction] Interpreted query:`, searchContext);
      console.log(`[SonarExtraction] Extracted ${candidates.length} candidates`);

      return { searchContext, candidates };

    } catch (parseError) {
      console.error('[SonarExtraction] Failed to parse JSON:', parseError);
      return getDefaultResult(originalQuery);
    }

  } catch (error) {
    console.error('[SonarExtraction] Perplexity API error:', error);
    throw error;
  }
}

function extractNameFromQuery(query: string): string {
  const beforeAt = query.split(/\s+(?:at|in)\s+/i)[0].trim();
  return beforeAt || query.split(' ').slice(0, 2).join(' ');
}

function getDefaultResult(query: string): ExtractionResult {
  return {
    searchContext: {
      interpretedName: extractNameFromQuery(query),
      interpretedCompany: undefined,
      interpretedRole: undefined,
      interpretedLocation: undefined
    },
    candidates: []
  };
}
