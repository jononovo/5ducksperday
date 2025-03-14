/**
 * Email Enrichment Module
 * 
 * Purpose: Validate and enhance discovered email addresses
 * Key Features:
 * - Deep validation
 * - Pattern verification
 * - Domain analysis
 * - Cross-reference validation
 */

import type { SearchModule } from '../shared/types';
import type { Contact } from '@shared/schema';

// Email validation utilities
export function isPlaceholderEmail(email: string): boolean {
  if (!email) return true;
  
  const placeholderPatterns = [
    /generic/i,
    /info@/i,
    /contact@/i,
    /hello@/i,
    /admin@/i,
    /support@/i,
    /sales@/i,
    /marketing@/i,
    /team@/i,
    /hr@/i,
    /jobs@/i,
    /careers@/i,
    /enquiries@/i,
    /inquiry@/i
  ];
  
  return placeholderPatterns.some(pattern => pattern.test(email));
}

export function isValidBusinessEmail(email: string): boolean {
  if (!email) return false;
  
  // Check for common free email providers
  const nonBusinessDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'aol.com',
    'icloud.com',
    'protonmail.com',
    'mail.com',
    'zoho.com'
  ];
  
  const parts = email.split('@');
  if (parts.length !== 2) return false;
  
  const domain = parts[1].toLowerCase();
  
  // If it's a common free email domain, it's not a business email
  if (nonBusinessDomains.includes(domain)) {
    return false;
  }
  
  return true;
}

export function validateEmailPattern(email: string): number {
  if (!email) return 0;
  
  const parts = email.split('@');
  if (parts.length !== 2) return 0;
  
  const [username, domain] = parts;
  let score = 0;
  
  // Check for valid domain structure
  if (/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](\.[a-zA-Z]{2,})+$/.test(domain)) {
    score += 40;
  }
  
  // Check common email patterns
  if (/^[a-zA-Z0-9._%+-]+$/.test(username)) {
    score += 30;
  }
  
  // Give higher scores to typical business email patterns
  if (/^[a-z]+\.[a-z]+$/i.test(username)) {
    // first.last format
    score += 20;
  } else if (/^[a-z][\.\-]?[a-z]+$/i.test(username)) {
    // flast or f.last or f-last format
    score += 15;
  } else if (/^[a-z]+$/i.test(username)) {
    // first format
    score += 10;
  }
  
  return Math.min(score, 100);
}

// Module configuration
export const emailEnrichmentModule: SearchModule = {
  name: "Email Enrichment",
  description: "Validates and enhances discovered emails",
  searches: [],
  config: {
    subsearches: {},
    searchOptions: {
      ignoreFranchises: false,
      locallyHeadquartered: false
    },
    searchSections: {},
    validationRules: {
      requiredFields: ['email', 'probability'],
      scoreThresholds: {
        minConfidence: 0.7
      },
      minimumConfidence: 70
    }
  }
};

export default emailEnrichmentModule;