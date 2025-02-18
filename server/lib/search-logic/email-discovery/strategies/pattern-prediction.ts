import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';
import { validateEmailPattern, isValidBusinessEmail, isPlaceholderEmail } from '../../../results-analysis/email-analysis';
import { validateNameLocally } from '../../../results-analysis/contact-name-validation';
import { combineValidationScores } from '../../../results-analysis/score-combination';

// Common business email formats
const EMAIL_FORMATS = [
  (first: string, last: string) => `${first}.${last}`,
  (first: string, last: string) => `${first[0]}${last}`,
  (first: string, last: string) => `${first}${last[0]}`,
  (first: string, last: string) => `${first}`,
  (first: string, last: string) => `${last}`,
  (first: string, last: string) => `${first[0]}.${last}`
];

function generatePossibleEmails(name: string, domain: string): string[] {
  const nameParts = name.toLowerCase().split(/\s+/);
  if (nameParts.length < 2) return [];

  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  return EMAIL_FORMATS.map(format => 
    `${format(firstName, lastName)}@${domain}`
  );
}

export const patternPredictionStrategy: EmailSearchStrategy = {
  name: "Pattern Prediction",
  description: "Predict email addresses based on common corporate patterns",

  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyDomain, existingContacts = [] } = context;

    if (!companyDomain) {
      return {
        source: "pattern_prediction",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: "No company domain provided"
        }
      };
    }

    try {
      // Track pattern attempts and results
      const attemptedPatterns: Record<string, string[]> = {};
      const predictedEmails: string[] = [];
      const validationResults: Record<string, number> = {};

      if (existingContacts.length === 0) {
        return {
          source: "pattern_prediction",
          emails: [],
          metadata: {
            searchDate: new Date().toISOString(),
            error: "No valid contact names found for pattern prediction"
          }
        };
      }

      for (const contact of existingContacts) {
        if (!contact.name) continue;

        // Validate contact name
        const localValidation = validateNameLocally(contact.name, contact.role || '');
        const validationScore = combineValidationScores(
          75, // Base confidence for existing contacts
          localValidation,
          companyName,
          {
            minimumScore: 30,
            companyNamePenalty: 20
          }
        );

        validationResults[contact.name] = validationScore;

        // Only generate emails for names with good validation scores
        if (validationScore >= 50) {
          const possibleEmails = generatePossibleEmails(contact.name, companyDomain);
          attemptedPatterns[contact.name] = possibleEmails;

          for (const email of possibleEmails) {
            if (validateEmailPattern(email) >= 70 && !isPlaceholderEmail(email)) {
              predictedEmails.push(email);
            }
          }
        }
      }

      return {
        source: "pattern_prediction",
        emails: predictedEmails,
        metadata: {
          searchDate: new Date().toISOString(),
          domain: companyDomain,
          patternsAttempted: attemptedPatterns,
          nameValidationScores: validationResults,
          totalPredictions: Object.values(attemptedPatterns).flat().length,
          validPredictions: predictedEmails.length
        }
      };

    } catch (error) {
      console.error(`Pattern prediction failed for ${companyName}:`, error);
      return {
        source: "pattern_prediction",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
};