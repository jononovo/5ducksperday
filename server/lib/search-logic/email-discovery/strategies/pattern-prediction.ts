import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';
import { validateEmailPattern, isValidBusinessEmail, isPlaceholderEmail } from '../../../results-analysis/email-analysis';

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
    const { companyName, companyDomain } = context;

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
      // We'll keep track of which patterns were tried
      const attemptedPatterns: Record<string, string[]> = {};
      const predictedEmails: string[] = [];

      // Get contact names from the company (this would come from other search results)
      const sampleNames = [
        "John Smith", // Example names - in real implementation these would come from other search results
        "Jane Doe"
      ];

      for (const name of sampleNames) {
        const possibleEmails = generatePossibleEmails(name, companyDomain);
        attemptedPatterns[name] = possibleEmails;

        for (const email of possibleEmails) {
          if (validateEmailPattern(email) >= 70 && !isPlaceholderEmail(email)) {
            predictedEmails.push(email);
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
