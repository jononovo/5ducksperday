import type { PerplexityMessage } from '../perplexity';

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// Query Perplexity AI API
export async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is not configured");
  }

  try {
    console.log('Sending request to Perplexity API with messages:', JSON.stringify(messages));
    
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages,
        temperature: 0.2,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Perplexity API error: Status ${response.status}, Response: ${errorText}`);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as PerplexityResponse;
    console.log('Raw API response:', JSON.stringify(data));
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw error;
  }
}
