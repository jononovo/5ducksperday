import type { Contact } from "@shared/schema";
import { validateRoleAffinity } from "./role-affinity-ai-scorer";

export interface CustomRoleAffinityOptions {
  customSearchTarget: string;
  enableCustomScoring: boolean;
}

const TIER_BONUSES = {
  1: 10, // Indirect affinity
  2: 15, // Close match  
  3: 20  // Exact/very close match
};

const DOWNGRADE_SCALE = [
  { min: 71, max: 75, downgradeTo: 71 },
  { min: 76, max: 80, downgradeTo: 72 },
  { min: 81, max: 85, downgradeTo: 73 },
  { min: 86, max: 90, downgradeTo: 74 }
];

const AFFINITY_THRESHOLD_MINIMUM = 70;

export async function applyCustomRoleAffinityScoring(
  contacts: Contact[],
  options: CustomRoleAffinityOptions
): Promise<Contact[]> {
  
  if (!options.enableCustomScoring || !options.customSearchTarget) {
    return contacts;
  }

  console.log(`Applying AI-based custom role affinity scoring for target: "${options.customSearchTarget}"`);

  // Extract unique roles for bulk AI validation
  const contactsWithRoles = contacts.filter(c => c.role);
  const uniqueRoles = Array.from(new Set(contactsWithRoles.map(c => c.role!)));
  
  if (uniqueRoles.length === 0) {
    console.log('No contacts with roles found, skipping custom scoring');
    return contacts;
  }

  // Get AI tier scores
  const aiTierScores = await validateRoleAffinity(
    uniqueRoles,
    options.customSearchTarget
  );

  return contacts.map(contact => {
    const originalScore = contact.probability || 0;
    let adjustedScore = originalScore;
    
    // Apply downgrade scale first
    adjustedScore = applyDowngradeScale(adjustedScore);
    
    // Apply role affinity if contact has role
    const tier = contact.role ? aiTierScores[contact.role] || 0 : 0;
    
    if (tier > 0) {
      // Apply threshold minimum for mid-range contacts with affinity
      if (originalScore >= 50 && originalScore < 70) {
        adjustedScore = AFFINITY_THRESHOLD_MINIMUM;
      }
      
      // Add tier bonus
      adjustedScore += TIER_BONUSES[tier as 1 | 2 | 3];
      
      console.log(`${contact.name}: ${originalScore} → ${adjustedScore} (Tier ${tier}, Role: ${contact.role})`);
    }
    
    return {
      ...contact,
      probability: Math.min(adjustedScore, 100),
      customScoring: {
        originalScore,
        tier,
        adjustedScore: Math.min(adjustedScore, 100)
      }
    };
  });
}

function applyDowngradeScale(score: number): number {
  for (const range of DOWNGRADE_SCALE) {
    if (score >= range.min && score <= range.max) {
      return range.downgradeTo;
    }
  }
  return score; // No downgrade needed
}

