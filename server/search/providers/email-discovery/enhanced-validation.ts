import { validateEmailPattern, isValidBusinessEmail, isPlaceholderEmail } from '../../results-analysis/email-analysis';
import { EmailValidationResult } from '../../perplexity';
import { splitFullName } from './aeroleads-search';

/**
 * Enhanced email validation library
 * Provides improved validation for email addresses with more sophisticated pattern recognition and scoring
 */

export interface EnhancedEmailValidationOptions {
  minimumPatternScore?: number;
  domainCheck?: boolean;
  crossReferenceValidation?: boolean;
  nameValidation?: boolean;
}

const DEFAULT_OPTIONS: EnhancedEmailValidationOptions = {
  minimumPatternScore: 60,
  domainCheck: true,
  crossReferenceValidation: true,
  nameValidation: true
};

/**
 * Enhanced validation for email addresses
 */
export function validateEmailEnhanced(
  email: string,
  options: EnhancedEmailValidationOptions = DEFAULT_OPTIONS
): number {
  if (!email || typeof email !== 'string') return 0;

  let score = 0;

  // Basic email format check (more strict than the basic validator)
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    score += 40;

    // Check for business domain (negative patterns)
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      // Penalize free email providers more aggressively
      if (/^(gmail|yahoo|hotmail|outlook|aol|protonmail|mail|icloud)\./i.test(domain)) {
        score -= 35;
      }
      
      // Reward business TLDs
      if (/\.(com|net|org|io|co)$/i.test(domain)) {
        score += 10;
      }
      
      // Extra points for less common but business-focused TLDs
      if (/\.(io|co|ai|tech|solutions|agency|consulting|group|partners|enterprises)$/i.test(domain)) {
        score += 5;
      }
    }

    // Enhanced name pattern checks
    const localPart = email.split('@')[0]?.toLowerCase();
    if (localPart) {
      // firstname.lastname format (most preferred)
      if (/^[a-z]+\.[a-z]+$/.test(localPart)) {
        score += 25;
      } 
      // first initial + lastname
      else if (/^[a-z]{1}\.[a-z]+$/.test(localPart)) {
        score += 20;
      }
      // firstnamelastname (no separator)
      else if (/^[a-z]+$/.test(localPart) && localPart.length > 5) {
        score += 15;
      }
      // first initial + lastname
      else if (/^[a-z][a-z]+$/.test(localPart) && localPart.length > 2) {
        score += 15;
      }
      // Penalize generic/role-based emails more aggressively
      if (/^(info|contact|support|sales|admin|office|help|team|general|hello|marketing|media|press|careers|jobs|hr)$/i.test(localPart)) {
        score -= 40;
      }
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generates email variations with enhanced techniques
 */
export function generateEnhancedEmailVariations(name: string, domain: string): string[] {
  if (!name || !domain) return [];

  const { firstName, lastName } = splitFullName(name);
  if (!firstName || !lastName) return [];

  // Create normalized versions of the name
  const first = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const last = lastName.toLowerCase().replace(/[^a-z]/g, '');
  
  // Generate more formats than the basic version
  return [
    // Standard formats
    `${first}.${last}@${domain}`,
    `${first[0]}.${last}@${domain}`,
    `${first}@${domain}`,
    `${last}@${domain}`,
    `${first}${last}@${domain}`,
    `${first}${last[0]}@${domain}`,
    `${first[0]}${last}@${domain}`,
    
    // Additional formats for enhanced search
    `${first}-${last}@${domain}`,
    `${first}_${last}@${domain}`,
    `${last}.${first}@${domain}`,
    `${first}.${last[0]}@${domain}`,
    `${first[0]}${last[0]}@${domain}`,
    `${first}${last}${Math.floor(Math.random() * 99) + 1}@${domain}` // With random number 1-99
  ].filter(email => validateEmailEnhanced(email) >= 50); // Only return reasonably valid patterns
}

/**
 * Performs multi-source validation for a list of emails
 */
export async function validateEmailsEnhanced(
  emails: string[],
  contactName?: string,
  companyName?: string
): Promise<EmailValidationResult> {
  try {
    let patternScore = 0;
    let businessDomainScore = 0;
    let nameMatchScore = 0;
    let placeholderCheck = false;

    // Sort emails by initial validation score
    const validatedEmails = emails
      .map(email => ({
        email,
        score: validateEmailEnhanced(email)
      }))
      .sort((a, b) => b.score - a.score);

    if (validatedEmails.length === 0) {
      return {
        score: 0,
        validationDetails: {
          patternScore: 0,
          businessDomainScore: 0,
          placeholderCheck: true
        }
      };
    }

    // Take best email for detailed analysis
    const bestEmail = validatedEmails[0].email;
    
    // Enhanced pattern validation
    patternScore = validatedEmails[0].score;

    // Check for business domain
    if (isValidBusinessEmail(bestEmail)) {
      businessDomainScore = 40;
    }

    // Check for placeholder emails
    placeholderCheck = isPlaceholderEmail(bestEmail);
    if (placeholderCheck) {
      patternScore = Math.max(0, patternScore - 60);
    }

    // Name matching if contact name is provided
    if (contactName && bestEmail) {
      const { firstName, lastName } = splitFullName(contactName);
      const localPart = bestEmail.split('@')[0].toLowerCase();
      
      // Check if name components appear in the email
      if (firstName && lastName) {
        const normalizedFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const normalizedLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
        
        if (localPart.includes(normalizedFirst) && localPart.includes(normalizedLast)) {
          nameMatchScore = 25;
        } else if (localPart.includes(normalizedFirst) || localPart.includes(normalizedLast)) {
          nameMatchScore = 15;
        } else if (
          localPart.includes(normalizedFirst[0]) && 
          normalizedLast.length > 2 && 
          localPart.includes(normalizedLast)
        ) {
          // First initial + last name
          nameMatchScore = 20;
        }
      }
    }

    // Combine scores with weights
    const finalScore = Math.min(100, Math.floor(
      (patternScore * 0.4) +
      (businessDomainScore * 0.3) +
      (nameMatchScore * 0.3)
    ));

    return {
      score: finalScore,
      validationDetails: {
        patternScore,
        businessDomainScore,
        placeholderCheck
      }
    };
  } catch (error) {
    console.error('Error in enhanced email validation:', error);
    return {
      score: 0,
      validationDetails: {
        patternScore: 0,
        businessDomainScore: 0,
        placeholderCheck: true
      }
    };
  }
}