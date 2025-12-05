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
  
  // Build context description for scoring explanation
  const contextParts: string[] = [];
  if (structuredSearch.company) contextParts.push(`company "${structuredSearch.company}"`);
  if (structuredSearch.role) contextParts.push(`role "${structuredSearch.role}"`);
  if (structuredSearch.location) contextParts.push(`location "${structuredSearch.location}"`);
  const contextDescription = contextParts.length > 0 ? contextParts.join(', ') : 'no specific context provided';
  
  return `You are analyzing web search results to find people matching a specific name.

SEARCH TARGET:
- Full Name: "${structuredSearch.fullName}"
  - First Name: "${firstName}" (or nicknames like Mike=Michael, Bob=Robert, Will=William, etc.)
  - Last Name: "${lastName}" (MUST match exactly)
${structuredSearch.company ? `- Context Company: "${structuredSearch.company}"` : ''}
${structuredSearch.role ? `- Context Role: "${structuredSearch.role}"` : ''}
${structuredSearch.location ? `- Context Location: "${structuredSearch.location}"` : ''}
${structuredSearch.knownEmail ? `- Known Email: "${structuredSearch.knownEmail}" (use domain to verify identity)` : ''}
${structuredSearch.otherContext ? `- Additional Context: "${structuredSearch.otherContext}"` : ''}

SEARCH RESULTS:
${searchResultsText}

YOUR TASK:
Find ALL people with the name "${structuredSearch.fullName}" (or nickname variations) and rank them by how closely they match the provided context (${contextDescription}).

IMPORTANT: Results can include:
- The SAME person at different companies (current role + previous roles)
- Different people who share the same name
- The key is: ALL results must have the matching name, ranked by context relevance

SCORING RULES (Total: 100 points):
- LAST NAME MATCH: 40 points (REQUIRED - skip anyone without matching last name "${lastName}")
- First name match: 10 points (exact) or 5 points (nickname variation)
- Company context match: 20 points (if "${structuredSearch.company || 'N/A'}" matches)
- Role context match: 15 points (if "${structuredSearch.role || 'N/A'}" matches or is similar)
- Location context match: 15 points (if "${structuredSearch.location || 'N/A'}" matches)

CRITICAL RULES:
1. ALL candidates MUST have last name "${lastName}" (case insensitive) - this is non-negotiable
2. Handle nickname variations: Mike=Michael, Bob=Robert, Will=William, Bill=William, Jim=James, etc.
3. Return 3-5 results ranked by context relevance score (highest first)
4. Same person at multiple companies = multiple results (e.g., current role + previous role)
5. Use "Unknown" for missing company/role - NEVER leave blank
6. Include reasoning explaining the context match score

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
      "reasoning": "Last name Cook matches (+40), first name Tim matches (+10), works at Apple as specified (+20), role is CEO as specified (+15) = 85 pts"
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
    : `You are analyzing web search results to find people matching a user's query.

ORIGINAL QUERY: "${originalQuery}"

SEARCH RESULTS:
${searchResultsText}

TASK:
1. First, interpret what the user is looking for from their query:
   - Person's name (required)
   - Company context (if mentioned, look for "at [company]")
   - Role context (if mentioned)
   - Location context (if mentioned, look for "in [city]" or city names like NYC, London, etc.)

2. Find ALL people with the matching name and rank by closeness to the context.
   - Results can be the SAME person at different companies (current + previous roles)
   - Results can be different people who share the same name
   - Rank by how well they match the provided context (company, role, location)

3. Score each result (0-100) based on context match:
   - Name match: 40 pts (required - last name must match)
   - First name: 10 pts (exact) or 5 pts (nickname like Mike=Michael)
   - Company context match: 20 pts
   - Role context match: 15 pts
   - Location context match: 15 pts

RULES:
- ALL results must have the same name (last name must match exactly)
- Return 3-5 results ranked by context relevance
- Same person at multiple companies = multiple results
- Use "Unknown" for missing company or role - NEVER leave blank
- Include reasoning explaining the context match

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
      "score": 85,
      "reasoning": "Last name matches (+40), first name matches (+10), company context matches (+20), role matches (+15) = 85 pts"
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
