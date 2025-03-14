/**
 * Email Deepdive Module
 * 
 * Purpose: Advanced email discovery and validation for high-value contacts
 * Key Features:
 * - Focus on leadership contacts
 * - Advanced pattern generation
 * - Role-based prioritization
 * - Deep verification
 * - Leadership role weighting
 */

import type { SearchModule } from '../shared/types';
import type { Contact } from '@shared/schema';

// Role-based confidence multipliers 
const roleConfidenceMultipliers = {
  // C-level and founders get highest priority
  founder: 1.5,
  owner: 1.5,
  ceo: 1.3,
  chief: 1.3,
  cto: 1.3,
  cfo: 1.3,
  coo: 1.3,
  
  // Directors get medium-high priority
  director: 1.2,
  vp: 1.2,
  head: 1.2,
  president: 1.2,
  
  // Managers get slight boost
  manager: 1.1,
  lead: 1.1,
  
  // Default is no boost
  default: 1.0
};

/**
 * Determines role priority level
 * Returns: multiplier to apply to confidence score
 */
export function getRoleMultiplier(role: string | null | undefined): number {
  if (!role) return roleConfidenceMultipliers.default;
  
  const lowerRole = role.toLowerCase();
  
  // Check for each role type and return appropriate multiplier
  if (lowerRole.includes('founder') || lowerRole.includes('owner')) {
    return roleConfidenceMultipliers.founder;
  } else if (lowerRole.includes('ceo') || 
           lowerRole.includes('chief') ||
           lowerRole.includes('cto') ||
           lowerRole.includes('cfo') ||
           lowerRole.includes('coo')) {
    return roleConfidenceMultipliers.chief;
  } else if (lowerRole.includes('director') || 
           lowerRole.includes('vp') ||
           lowerRole.includes('head') ||
           lowerRole.includes('president')) {
    return roleConfidenceMultipliers.director;
  } else if (lowerRole.includes('manager') || lowerRole.includes('lead')) {
    return roleConfidenceMultipliers.manager;
  }
  
  return roleConfidenceMultipliers.default;
}

/**
 * Determines if a contact is in a leadership position
 */
export function isLeadershipRole(role: string | null | undefined): boolean {
  if (!role) return false;
  
  const lowerRole = role.toLowerCase();
  
  return lowerRole.includes('ceo') || 
         lowerRole.includes('cto') ||
         lowerRole.includes('cfo') ||
         lowerRole.includes('coo') ||
         lowerRole.includes('chief') ||
         lowerRole.includes('founder') ||
         lowerRole.includes('owner') ||
         lowerRole.includes('director') ||
         lowerRole.includes('president') ||
         lowerRole.includes('vp') ||
         lowerRole.includes('head');
}

/**
 * Determines if email domain matches company domain
 */
export function isDomainMatch(email: string | null | undefined, companyDomain: string | null | undefined): boolean {
  if (!email || !companyDomain) return false;
  
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const emailDomain = parts[1].toLowerCase();
  return emailDomain === companyDomain.toLowerCase();
}

// Module configuration
export const emailDeepDiveModule: SearchModule = {
  name: "Email Deepdive",
  description: "Advanced email analysis focused on high-value contacts",
  searches: [],
  config: {
    subsearches: {},
    searchOptions: {
      ignoreFranchises: false,
      locallyHeadquartered: false
    },
    searchSections: {},
    validationRules: {
      requiredFields: ['email', 'role', 'probability'],
      scoreThresholds: {
        minConfidence: 0.75,
        leadershipBoost: 1.3
      },
      minimumConfidence: 75
    }
  }
};

export default emailDeepDiveModule;