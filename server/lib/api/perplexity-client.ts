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
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sonar",
        messages,
        temperature: 0.1,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json() as PerplexityResponse;
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Perplexity API error:', error);
    throw error;
  }
}
