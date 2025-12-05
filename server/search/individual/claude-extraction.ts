import Anthropic from '@anthropic-ai/sdk';
import type { SearchResult, StructuredSearchData } from './perplexity-search-api';
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

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

function buildStructuredPrompt(structuredSearch: StructuredSearchData, searchResultsText: string): string {
  const nameParts = structuredSearch.fullName.split(' ');
  const lastName = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];
  
  return `You are analyzing web search results to find a specific professional.

SEARCH TARGET (User-Provided Fields):
- Full Name: "${structuredSearch.fullName}"
  - First Name: "${firstName}"
  - Last Name: "${lastName}" (MUST match exactly or be very close)
${structuredSearch.company ? `- Company: "${structuredSearch.company}"` : '- Company: Not specified'}
${structuredSearch.role ? `- Role/Title: "${structuredSearch.role}"` : '- Role/Title: Not specified'}
${structuredSearch.location ? `- Location: "${structuredSearch.location}"` : '- Location: Not specified'}
${structuredSearch.knownEmail ? `- Known Email: "${structuredSearch.knownEmail}" (use domain to verify company)` : ''}
${structuredSearch.otherContext ? `- Additional Context: "${structuredSearch.otherContext}"` : ''}

SEARCH RESULTS:
${searchResultsText}

SCORING RULES (Total: 100 points):
- LAST NAME EXACT MATCH: 50 points (REQUIRED - candidates without matching last name get 0)
- First name match: 15 points (exact) or 8 points (nickname like Mike/Michael, Rob/Robert)
- Company match: 15 points (if company was specified and matches)
- Role match: 10 points (if role was specified and matches field)
- Location match: 10 points (if location was specified and matches)

CRITICAL RULES:
1. LAST NAME MUST MATCH - Only include candidates whose last name matches "${lastName}" (case insensitive)
2. Handle nickname variations: Mike=Michael, Bob=Robert, Will=William, etc.
3. Return 3-5 DISTINCT candidates, ranked by score
4. Use "Unknown" for missing company/role - NEVER leave blank
5. Include reasoning that explains each score

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
      "score": 85,
      "reasoning": "Last name Smith matches exactly (+50), first name John matches (+15), works at Acme Corp as specified (+15) = 80 pts"
    }
  ]
}`;
}

export async function extractCandidatesWithClaude(
  originalQuery: string,
  searchResults: SearchResult[],
  structuredSearch?: StructuredSearchData
): Promise<ExtractionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[ClaudeExtraction] Anthropic API key is not configured');
    throw new Error('Anthropic API key is not configured. Please add ANTHROPIC_API_KEY to enable individual search extraction.');
  }

  const anthropic = new Anthropic({ apiKey });

  console.log(`[ClaudeExtraction] Extracting candidates from ${searchResults.length} search results`);
  if (structuredSearch) {
    console.log(`[ClaudeExtraction] Using structured search:`, structuredSearch);
  }

  const searchResultsText = searchResults
    .map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}\n`)
    .join('\n');

  const prompt = structuredSearch 
    ? buildStructuredPrompt(structuredSearch, searchResultsText)
    : `You are analyzing web search results to find professionals matching a user's query.

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
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: 'You are a professional researcher extracting candidate information from search results. Always return valid JSON only, with no additional text or explanation.'
    });

    const content = response.content[0];
    if (content.type !== 'text' || !content.text) {
      console.error('[ClaudeExtraction] No text content in response');
      return getDefaultResult(originalQuery);
    }

    console.log(`[ClaudeExtraction] Raw response length: ${content.text.length} chars`);

    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('[ClaudeExtraction] No JSON found in response');
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

      console.log(`[ClaudeExtraction] Interpreted query:`, searchContext);
      console.log(`[ClaudeExtraction] Extracted ${candidates.length} candidates`);
      
      // Log each extracted candidate for debugging
      if (candidates.length > 0) {
        console.log(`[ClaudeExtraction] ========== EXTRACTED CANDIDATES ==========`);
        candidates.forEach((c, i) => {
          console.log(`[ClaudeExtraction] [${i + 1}] Name: ${c.name}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Company: ${c.currentCompany}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Role: ${c.currentRole}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Score: ${c.score}`);
          console.log(`[ClaudeExtraction] [${i + 1}] Reasoning: ${c.reasoning}`);
          console.log(`[ClaudeExtraction] ---`);
        });
        console.log(`[ClaudeExtraction] ==========================================`);
      }

      return { searchContext, candidates };

    } catch (parseError) {
      console.error('[ClaudeExtraction] Failed to parse JSON:', parseError);
      return getDefaultResult(originalQuery);
    }

  } catch (error) {
    console.error('[ClaudeExtraction] Claude API error:', error);
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
