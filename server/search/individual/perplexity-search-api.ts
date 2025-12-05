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

export async function searchPerplexityApi(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('Perplexity API key is not configured');
  }

  console.log(`[PerplexitySearchAPI] Searching for: "${query}"`);

  try {
    const response = await fetch('https://api.perplexity.ai/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
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
