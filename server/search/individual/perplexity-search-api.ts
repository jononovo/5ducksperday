export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  date?: string;
  last_updated?: string;
}

export interface PerplexitySearchApiResponse {
  results: SearchResult[];
}

export interface StructuredSearchData {
  fullName: string;
  location?: string;
  role?: string;
  company?: string;
  otherContext?: string;
  knownEmail?: string;
}

function buildOptimizedQuery(structuredSearch: StructuredSearchData): string {
  const parts: string[] = [];
  
  parts.push(`"${structuredSearch.fullName}"`);
  
  if (structuredSearch.role) {
    parts.push(structuredSearch.role);
  }
  
  if (structuredSearch.company) {
    parts.push(`"${structuredSearch.company}"`);
  }
  
  if (structuredSearch.location) {
    parts.push(structuredSearch.location);
  }
  
  if (structuredSearch.otherContext) {
    parts.push(structuredSearch.otherContext);
  }
  
  parts.push('LinkedIn OR professional profile');
  
  return parts.join(' ');
}

export async function searchPerplexityApi(
  query: string,
  structuredSearch?: StructuredSearchData
): Promise<SearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('Perplexity API key is not configured');
  }

  const searchQuery = structuredSearch 
    ? buildOptimizedQuery(structuredSearch)
    : query;

  console.log(`[PerplexitySearchAPI] Searching for: "${searchQuery}"`);
  if (structuredSearch) {
    console.log(`[PerplexitySearchAPI] Using structured search:`, structuredSearch);
  }

  try {
    const response = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: searchQuery,
        max_results: 10,
        max_tokens_per_page: 1024,
        search_recency_filter: 'year'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[PerplexitySearchAPI] API error: ${response.status} - ${errorText}`);
      throw new Error(`Perplexity Search API error: ${response.status}`);
    }

    const data = await response.json() as PerplexitySearchApiResponse;
    
    console.log(`[PerplexitySearchAPI] Found ${data.results?.length || 0} results`);
    
    // Log each result for debugging
    if (data.results && data.results.length > 0) {
      console.log(`[PerplexitySearchAPI] ========== RAW SEARCH RESULTS ==========`);
      data.results.forEach((result, index) => {
        console.log(`[PerplexitySearchAPI] [${index + 1}] Title: ${result.title}`);
        console.log(`[PerplexitySearchAPI] [${index + 1}] URL: ${result.url}`);
        console.log(`[PerplexitySearchAPI] [${index + 1}] Snippet: ${result.snippet?.substring(0, 200)}...`);
        console.log(`[PerplexitySearchAPI] ---`);
      });
      console.log(`[PerplexitySearchAPI] ========================================`);
    }
    
    return data.results || [];

  } catch (error) {
    console.error('[PerplexitySearchAPI] Search error:', error);
    throw error;
  }
}
