import type { Contact } from "@shared/schema";

export interface CustomRoleAffinityOptions {
  customSearchTarget: string;
  enableCustomScoring: boolean;
}

export interface RoleAffinityResult {
  contactId: string;
  originalScore: number;
  affinityTier: 1 | 2 | 3 | null;
  bonusPoints: number;
  adjustedScore: number;
}

const BASELINE_ADJUSTMENT = -5;
const TIER_BONUSES = {
  1: 15, // Exact/very close match
  2: 10, // Close match  
  3: 5   // Indirect affinity
};

export function applyCustomRoleAffinityScoring(
  contacts: Contact[],
  options: CustomRoleAffinityOptions
): Contact[] {
  if (!options.enableCustomScoring || !options.customSearchTarget) {
    return contacts; // No changes if custom scoring disabled
  }

  console.log(`Applying custom role affinity scoring for target: "${options.customSearchTarget}"`);

  return contacts.map(contact => {
    const originalScore = contact.probability || 0;
    
    // Apply baseline adjustment to all contacts
    let adjustedScore = originalScore + BASELINE_ADJUSTMENT;
    
    // Calculate role affinity if contact has a role
    let affinityTier: 1 | 2 | 3 | null = null;
    if (contact.role) {
      affinityTier = calculateRoleAffinity(contact.role, options.customSearchTarget);
      if (affinityTier) {
        adjustedScore += TIER_BONUSES[affinityTier];
      }
    }
    
    // Ensure score stays within valid range
    adjustedScore = Math.max(0, Math.min(100, adjustedScore));
    
    // Debug logging for custom scoring
    if (affinityTier) {
      console.log(`${contact.name}: ${originalScore} → ${adjustedScore} (Tier ${affinityTier}, Role: ${contact.role})`);
    }
    
    return {
      ...contact,
      probability: adjustedScore,
      // Add metadata for debugging
      customScoring: {
        originalScore,
        affinityTier,
        adjustedScore
      }
    };
  });
}

function calculateRoleAffinity(contactRole: string, targetRole: string): 1 | 2 | 3 | null {
  const normalizedContact = contactRole.toLowerCase().trim();
  const normalizedTarget = targetRole.toLowerCase().trim();
  
  // Tier 1: Exact or very close match
  if (normalizedContact.includes(normalizedTarget) || normalizedTarget.includes(normalizedContact)) {
    return 1;
  }
  
  // Extract key terms for comparison
  const targetKeywords = extractRoleKeywords(normalizedTarget);
  const contactKeywords = extractRoleKeywords(normalizedContact);
  
  // Tier 2: Close match (same domain/function)
  const strongMatches = targetKeywords.filter(keyword => 
    contactKeywords.some(ck => ck.includes(keyword) || keyword.includes(ck))
  );
  
  if (strongMatches.length >= 1) {
    return 2;
  }
  
  // Tier 3: Indirect affinity (related responsibilities)
  const indirectMatches = checkIndirectAffinity(normalizedContact, normalizedTarget);
  if (indirectMatches) {
    return 3;
  }
  
  return null; // No affinity
}

function extractRoleKeywords(role: string): string[] {
  // Remove common role level words and extract key function words
  const cleanRole = role
    .toLowerCase()
    .replace(/\b(senior|junior|lead|principal|head|chief|vice|assistant|associate|director|manager|supervisor|coordinator|specialist|analyst|executive|officer)\b/g, '')
    .trim();
  
  // Split and filter meaningful keywords
  return cleanRole
    .split(/[\s\-_\/]+/)
    .filter(word => word.length > 2)
    .filter(word => !['and', 'the', 'of', 'for', 'in', 'at', 'to', 'on'].includes(word));
}

function checkIndirectAffinity(contactRole: string, targetRole: string): boolean {
  // Define role affinity groups for indirect matching
  const roleGroups = {
    marketing: ['marketing', 'brand', 'advertising', 'communications', 'pr', 'digital', 'content', 'social'],
    engineering: ['engineering', 'software', 'development', 'technical', 'technology', 'architect', 'programmer'],
    sales: ['sales', 'business development', 'account', 'revenue', 'commercial', 'partnership'],
    operations: ['operations', 'logistics', 'supply chain', 'procurement', 'fulfillment', 'manufacturing'],
    finance: ['finance', 'accounting', 'financial', 'treasury', 'budget', 'controller', 'audit'],
    hr: ['human resources', 'hr', 'people', 'talent', 'recruiting', 'organizational'],
    product: ['product', 'innovation', 'strategy', 'planning', 'roadmap'],
    legal: ['legal', 'compliance', 'regulatory', 'counsel', 'risk', 'governance']
  };
  
  // Check if both roles belong to the same functional group
  for (const [group, keywords] of Object.entries(roleGroups)) {
    const contactInGroup = keywords.some(keyword => contactRole.includes(keyword));
    const targetInGroup = keywords.some(keyword => targetRole.includes(keyword));
    
    if (contactInGroup && targetInGroup) {
      return true;
    }
  }
  
  return false;
}