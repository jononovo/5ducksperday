import type { Company, Contact } from "@shared/schema";
import { queryPerplexity } from "./api/perplexity-client";
import type { PerplexityMessage } from "./types/perplexity";

/**
 * Core Perplexity AI interaction module
 * Handles direct interactions with the Perplexity API for company and contact analysis
 */

export async function analyzeWithPerplexity(
  prompt: string,
  systemPrompt: string,
  responseFormat?: string
): Promise<string> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: systemPrompt + (responseFormat ? `\n\nFormat your response as JSON:\n${responseFormat}` : '')
    },
    {
      role: "user",
      content: prompt
    }
  ];

  return queryPerplexity(messages);
}

// Re-export essential analysis functions
export { extractContacts } from "./results-analysis/contact-extraction";
export { parseCompanyData } from "./results-analysis/company-parser";
export type { PerplexityMessage };