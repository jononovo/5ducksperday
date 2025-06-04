/**
 * Utility functions for cleaning Perplexity API responses
 * Removes markdown formatting and extracts clean JSON
 */

export function cleanPerplexityResponse(response: string): string {
  return response.trim().replace(/```(?:json)?\s*|\s*```/g, '');
}

export function parseCleanedJSON<T = any>(response: string): T {
  const cleanedResponse = cleanPerplexityResponse(response);
  return JSON.parse(cleanedResponse);
}

export function safeParseJSON<T = any>(response: string): T | null {
  try {
    return parseCleanedJSON<T>(response);
  } catch (error) {
    console.error('JSON parsing failed:', error);
    return null;
  }
}