import type { Company, Contact } from "@shared/schema";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
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
    throw new Error(`Perplexity API error: ${response.statusText}`);
  }

  const data = await response.json() as PerplexityResponse;
  return data.choices[0].message.content;
}

export async function analyzeCompany(
  companyName: string, 
  prompt: string
): Promise<string> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a business intelligence analyst. Provide detailed, factual information about companies."
    },
    {
      role: "user",
      content: prompt.replace("[COMPANY]", companyName)
    }
  ];

  return queryPerplexity(messages);
}

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  // Implement parsing logic to extract structured data from AI responses
  // This is a simplified example
  return {
    name: "",
    size: 0,
    website: "",
    services: [],
    validationPoints: [],
    totalScore: 0,
    snapshot: {}
  };
}

export function extractContacts(analysisResults: string[]): Partial<Contact>[] {
  // Implement contact extraction logic from AI responses
  // This is a simplified example
  return [];
}
