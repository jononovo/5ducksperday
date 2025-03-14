// Using type directly since the shared schema import is causing issues
// This matches the Contact type in shared/schema.ts
type Contact = {
  id?: number;
  email?: string | null;
  createdAt?: Date | null;
  name?: string;
  userId?: number;
  companyId?: number;
  role?: string | null;
  probability?: number | null;
  linkedinUrl?: string | null;
  phone?: string | null;
  verificationSource?: string | null;
  validationMethod?: string | null;
  verifiedAt?: Date | null;
  enrichmentSource?: string | null;
  enrichedAt?: Date | null;
  score?: number | null;
  completedSearches?: string[] | null;
};
import { parseFullName, validatePersonName, isLikelyCompanyName, isLikelyDepartmentOrRole } from './enhanced-name-parsing';
import { validateName } from '../../results-analysis/contact-name-validation';

/**
 * Enhanced contact discovery and validation module
 * Provides improved validation and filtering for discovered contacts
 */

export interface DiscoveryOptions {
  minimumNameScore?: number;
  companyNamePenalty?: number;
  roleTitleBoost?: number;
  filterGenericNames?: boolean;
  preferFullNames?: boolean;
}

const DEFAULT_OPTIONS: DiscoveryOptions = {
  minimumNameScore: 65,
  companyNamePenalty: 30,
  roleTitleBoost: 15,
  filterGenericNames: true,
  preferFullNames: true
};

// Legacy mode options for more lenient discovery
export const LEGACY_OPTIONS: DiscoveryOptions = {
  minimumNameScore: 30,
  companyNamePenalty: 15,
  roleTitleBoost: 25,
  filterGenericNames: false,
  preferFullNames: true
};

/**
 * Validates and scores a contact based on multiple factors
 * @returns Score from 0-100
 */
export function validateContact(
  contact: Partial<Contact>,
  companyName: string,
  options: DiscoveryOptions = DEFAULT_OPTIONS
): number {
  if (!contact.name) return 0;
  
  let score = 0;
  
  // Basic name validation
  const basicNameScore = validatePersonName(contact.name);
  score += basicNameScore * 0.4; // 40% weight
  
  // More advanced name validation using existing validation logic
  const advancedValidation = validateName(
    contact.name,
    contact.role || '',
    companyName,
    {
      minimumScore: options.minimumNameScore,
      companyNamePenalty: options.companyNamePenalty
    }
  );
  
  score += advancedValidation.score * 0.3; // 30% weight
  
  // Check if it's a company name
  if (isLikelyCompanyName(contact.name)) {
    score = Math.max(0, score - 40);
  }
  
  // Check if it's a department/role
  if (isLikelyDepartmentOrRole(contact.name)) {
    score = Math.max(0, score - 25);
  }
  
  // Bonus for having complete info
  if (contact.name && contact.role && contact.email) {
    score += 10;
  }
  
  // Bonus for having a role/title
  if (contact.role && contact.role.length > 3) {
    score += options.roleTitleBoost || 0;
    
    // Additional bonus for senior roles
    const lowerRole = contact.role.toLowerCase();
    // Leadership roles - check if using legacy options for higher boost
    const isLegacyMode = options.minimumNameScore === LEGACY_OPTIONS.minimumNameScore;
    
    // C-level executives
    if (
      lowerRole.includes('ceo') ||
      lowerRole.includes('cto') ||
      lowerRole.includes('cfo') ||
      lowerRole.includes('chief') ||
      lowerRole.includes('president')
    ) {
      score += isLegacyMode ? 30 : 15; // Higher boost in legacy mode
    }
    // Founders and owners
    else if (
      lowerRole.includes('founder') ||
      lowerRole.includes('owner') ||
      lowerRole.includes('partner')
    ) {
      score += isLegacyMode ? 35 : 15; // Even higher boost for founders in legacy mode
    }
    // Directors and VPs
    else if (
      lowerRole.includes('director') ||
      lowerRole.includes('vp') ||
      lowerRole.includes('vice president') ||
      lowerRole.includes('head of')
    ) {
      score += isLegacyMode ? 25 : 15; // Higher boost in legacy mode
    }
    // Managers and leads
    else if (
      lowerRole.includes('manager') ||
      lowerRole.includes('lead') ||
      lowerRole.includes('principal')
    ) {
      score += isLegacyMode ? 15 : 10; // Some boost in legacy mode
    }
  }
  
  // Full name bonus (first and last name)
  if (options.preferFullNames) {
    const { firstName, lastName } = parseFullName(contact.name);
    if (firstName && lastName && firstName.length > 1 && lastName.length > 1) {
      score += 10;
    }
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Filters a list of contacts, removing low-quality ones
 */
export function filterContacts(
  contacts: Partial<Contact>[],
  companyName: string,
  options: DiscoveryOptions = DEFAULT_OPTIONS
): Partial<Contact>[] {
  if (!contacts || contacts.length === 0) return [];
  
  // Score all contacts
  const scoredContacts = contacts.map(contact => ({
    ...contact,
    _score: validateContact(contact, companyName, options)
  }));
  
  // Filter out low-quality contacts
  const filteredContacts = scoredContacts.filter(
    contact => contact._score >= (options.minimumNameScore || DEFAULT_OPTIONS.minimumNameScore || 50)
  );
  
  // Sort by score
  const sortedContacts = filteredContacts.sort((a, b) => (b._score || 0) - (a._score || 0));
  
  // Remove the temporary score property
  return sortedContacts.map(({ _score, ...contact }) => contact);
}

/**
 * Deduplicate contacts by name with fuzzy matching
 */
export function deduplicateContacts(contacts: Partial<Contact>[]): Partial<Contact>[] {
  if (!contacts || contacts.length === 0) return [];
  
  const uniqueContacts: Partial<Contact>[] = [];
  const nameMap = new Map<string, boolean>();
  
  for (const contact of contacts) {
    if (!contact.name) continue;
    
    // Normalize name for comparison
    const normalizedName = contact.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Check for duplicates with fuzzy matching
    let isDuplicate = false;
    
    // Convert Map entries to array to avoid iterator type issues
    const existingNames = Array.from(nameMap.keys());
    
    for (const existingName of existingNames) {
      const similarityScore = calculateSimilarity(normalizedName, existingName);
      if (similarityScore > 0.8) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      nameMap.set(normalizedName, true);
      uniqueContacts.push(contact);
    }
  }
  
  return uniqueContacts;
}

/**
 * Calculate similarity between two strings (0-1)
 * Using Levenshtein distance algorithm
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Calculate Levenshtein distance
  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter.charAt(i - 1) !== longer.charAt(j - 1)) {
          newValue = Math.min(
            Math.min(newValue, lastValue),
            costs[j]
          ) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }
  
  return (longer.length - costs[longer.length]) / longer.length;
}