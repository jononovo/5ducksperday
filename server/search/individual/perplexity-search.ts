import type { WebSearchResult, ParsedIndividualQuery, CandidateResult } from './types';
import { formatSearchQuery } from './query-parser';

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

export async function searchWebForPerson(parsed: ParsedIndividualQuery): Promise<WebSearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('Perplexity API key is not configured');
  }

  const searchQuery = formatSearchQuery(parsed);
  console.log(`[PerplexitySearch] Searching for: "${searchQuery}"`);

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
            content: `You are a professional researcher. Search for information about the person "${parsed.personName}".
Return ONLY a JSON array of search results you find. Each result should have: title, url, snippet.
Focus on professional profiles, company pages, news articles, conference bios, and any source that mentions this person.
Return at least 10-15 results if available.`
          },
          {
            role: 'user',
            content: `Find professional information about: ${searchQuery}

Return results as JSON array:
[{"title": "...", "url": "...", "snippet": "..."}]`
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
    
    if (data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      console.log(`[PerplexitySearch] Raw response length: ${content.length} chars`);
      
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const results = JSON.parse(jsonMatch[0]) as WebSearchResult[];
          console.log(`[PerplexitySearch] Parsed ${results.length} search results`);
          return results;
        }
      } catch (parseError) {
        console.error('[PerplexitySearch] Failed to parse JSON results:', parseError);
      }
    }

    console.log('[PerplexitySearch] No valid results found in response');
    return [];

  } catch (error) {
    console.error('[PerplexitySearch] Search error:', error);
    throw error;
  }
}

const CANDIDATE_EXTRACTION_PROMPT = `You are analyzing web search results to identify candidates matching a person search.

TASK: Extract professional candidates from the search results below and score them against the original query.

SCORING CRITERIA (0-100):
- Name match: Exact match = 40 points, partial = 20 points
- Company match (if provided): Exact = 30 points, related = 15 points
- Location match (if provided): Same region = 15 points
- Role match (if provided): Same field = 15 points
- Recency: Recent info = bonus points

RULES:
1. Each candidate must have a name and current company (required)
2. Deduplicate: If same person appears in multiple results, merge and use best info
3. Return 3-5 candidates maximum, sorted by score (highest first)
4. If company is unknown but person is clearly identified, use "Unknown" as company
5. Only return candidates you're confident are real people (not fictional or examples)

RETURN FORMAT (JSON only, no other text):
{
  "candidates": [
    {
      "name": "Full Name",
      "currentCompany": "Company Name",
      "currentRole": "Job Title",
      "companyWebsite": "https://...",
      "linkedinUrl": "https://linkedin.com/in/...",
      "score": 85,
      "reasoning": "Brief explanation of score"
    }
  ]
}`;

export async function extractCandidatesFromResults(
  results: WebSearchResult[],
  parsed: ParsedIndividualQuery
): Promise<CandidateResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('Perplexity API key is not configured');
  }

  if (results.length === 0) {
    console.log('[PerplexitySearch] No results to extract candidates from');
    return [];
  }

  const resultsText = results.map((r, i) => 
    `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.snippet}`
  ).join('\n\n');

  const queryContext = [
    `Person name: ${parsed.personName}`,
    parsed.companyHint ? `Company hint: ${parsed.companyHint}` : null,
    parsed.locationHint ? `Location hint: ${parsed.locationHint}` : null,
    parsed.roleHint ? `Role hint: ${parsed.roleHint}` : null
  ].filter(Boolean).join('\n');

  console.log(`[PerplexitySearch] Extracting candidates from ${results.length} results`);

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
            content: CANDIDATE_EXTRACTION_PROMPT
          },
          {
            role: 'user',
            content: `ORIGINAL QUERY CONTEXT:
${queryContext}

SEARCH RESULTS TO ANALYZE:
${resultsText}

Extract and score the candidates. Return JSON only.`
          }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PerplexitySearch] Extraction API error: ${response.status} - ${errorText}`);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json() as PerplexitySearchResponse;

    if (data.choices && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*"candidates"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { candidates: CandidateResult[] };
          const candidates = parsed.candidates
            .filter(c => c.name && c.currentCompany)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
          
          console.log(`[PerplexitySearch] Extracted ${candidates.length} candidates`);
          return candidates;
        }
      } catch (parseError) {
        console.error('[PerplexitySearch] Failed to parse candidate JSON:', parseError);
      }
    }

    console.log('[PerplexitySearch] No valid candidates extracted');
    return [];

  } catch (error) {
    console.error('[PerplexitySearch] Extraction error:', error);
    throw error;
  }
}
