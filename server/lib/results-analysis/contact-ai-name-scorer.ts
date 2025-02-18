import type { Contact } from "@shared/schema";
import { validateName } from "./contact-name-validation";
import { queryPerplexity } from "../api/perplexity-client";
import type { PerplexityMessage } from "../types/perplexity";

// Validate names using Perplexity AI
export async function validateNames(
  names: string[],
  companyName?: string,
  searchPrompt?: string
): Promise<Record<string, number>> {
  console.log(`Running AI validation for ${names.length} contacts`);

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a contact name validation service. Analyze each name and return a JSON object with scores between 1-95. Consider:

      1. Common name patterns (max 95 points)
      2. Professional context (can reduce score by up to 30 points)
      3. Job title contamination (reduces score by 40 points)
      4. Realistic vs placeholder names (placeholder names max 10 points)
      5. Names should not contain terms from the search prompt: "${searchPrompt || ''}"

      Scoring rules (maximum 95 points):
      - 85-95: Full proper name with clear first/last, very likely real (e.g. "Michael Johnson")
      - 70-84: Common but incomplete name, likely real (e.g. "Mike J.")
      - 50-69: Ambiguous or unusual, possibly real (e.g. "M. Johnson III")
      - 30-49: Possibly not a name (e.g. "Sales Team", "Tech Lead")
      - 1-29: Obviously not a person's name

      Additional Penalties (applied after initial score):
      - Contains job titles: -40 points
      - Contains company terms: -30 points
      - Contains generic business terms: -20 points
      - Contains search terms: -25 points per term

      Return ONLY a JSON object like:
      {
        "Michael Johnson": 85,
        "Sales Department": 15,
        "Tech Lead Smith": 45
      }`
    },
    {
      role: "user",
      content: `Score these names (output only JSON): ${JSON.stringify(names)}`
    }
  ];

  try {
    const response = await queryPerplexity(messages);
    console.log('AI validation response received');

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const validated: Record<string, number> = {};

        console.log('Processing AI validation scores');
        for (const [name, score] of Object.entries(parsed)) {
          if (typeof score === 'number' && score >= 1 && score <= 95) {
            console.log(`AI Score for "${name}": ${score}`);
            validated[name] = score;
          }
        }
        return validated;
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        return {}; // Return empty object on parse error
      }
    }
    console.error('No valid JSON found in AI response');
    return {};
  } catch (error) {
    console.error('Error in AI name validation:', error);
    return {};
  }
}
