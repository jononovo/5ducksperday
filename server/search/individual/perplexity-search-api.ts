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
        max_results: 20,
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
    
    return data.results || [];

  } catch (error) {
    console.error('[PerplexitySearchAPI] Search error:', error);
    throw error;
  }
}
