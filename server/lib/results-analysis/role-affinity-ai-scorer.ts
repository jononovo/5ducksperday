import { queryPerplexity } from "../api/perplexity-client";
import type { PerplexityMessage } from "../types/perplexity";

export async function validateRoleAffinity(
  contactRoles: string[],
  targetRole: string,
  companyName?: string
): Promise<Record<string, number>> {
  
  if (contactRoles.length === 0) {
    return {};
  }

  console.log(`Running AI role affinity validation for ${contactRoles.length} roles against target: "${targetRole}"`);

  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a role affinity scoring service. Analyze how well each contact role matches the target role and return a JSON object with tier scores.

      Scoring Guidelines:
      - Tier 3 (return 3): Exact or very close match (e.g., "CTO" matches "Chief Technology Officer", "VP Engineering" matches "CTO")
      - Tier 2 (return 2): Close functional match (e.g., "Director of Engineering" matches "CTO", "Head of Marketing" matches "CMO") 
      - Tier 1 (return 1): Indirect affinity (e.g., "Product Manager" matches "CTO", "Sales Director" matches "VP Sales")
      - No Match (return 0): No relevant affinity

      Return only valid JSON format: {"Role Name": tier_number}
      Do not include explanations, only the JSON object.`
    },
    {
      role: "user", 
      content: `Target Role: "${targetRole}"
      ${companyName ? `Company: ${companyName}` : ''}
      
      Contact Roles to score:
      ${contactRoles.map((role, i) => `"${role}"`).join('\n')}
      
      Return JSON with tier scores (0-3):`
    }
  ];

  try {
    const response = await queryPerplexity(messages);
    const scores = JSON.parse(response);
    console.log(`AI role affinity validation complete for target "${targetRole}"`);
    return scores;
  } catch (error) {
    console.error('Error in AI role affinity validation:', error);
    return {};
  }
}