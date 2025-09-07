import type { EmailSearchStrategy, EmailSearchContext, EmailSearchResult } from '../types';
import { validateEmailEnhanced, generateEnhancedEmailVariations } from '../enhanced-validation';
import { validateName } from '../../../results-analysis/contact-name-validation';
import { isPlaceholderEmail } from '../../../results-analysis/email-analysis';

/**
 * Enhanced pattern prediction strategy
 * Uses improved name parsing and email pattern generation
 */
export const enhancedPatternPredictionStrategy: EmailSearchStrategy = {
  name: "Enhanced Pattern Prediction",
  description: "Advanced email pattern prediction with improved validation and cross-referencing",

  async execute(context: EmailSearchContext): Promise<EmailSearchResult> {
    const { companyName, companyDomain, existingContacts = [] } = context;

    if (!companyDomain) {
      return {
        source: "enhanced_pattern_prediction",
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
      const crossReferencedResults: Record<string, number> = {};

      if (existingContacts.length === 0) {
        return {
          source: "enhanced_pattern_prediction",
          emails: [],
          metadata: {
            searchDate: new Date().toISOString(),
            error: "No valid contact names found for pattern prediction"
          }
        };
      }

      for (const contact of existingContacts) {
        if (!contact.name) continue;

        // Validate contact name with stricter rules
        const validationResult = validateName(contact.name, contact.role || '', companyName, {
          minimumScore: 50, // Higher minimum score
          companyNamePenalty: 30, // Stronger penalty for company name similarity
          useLocalValidation: true,
          localValidationWeight: 0.7
        });
        const validationScore = validationResult.score;

        validationResults[contact.name] = validationScore;

        // Only generate emails for names with good validation scores
        if (validationScore >= 60) { // Increased threshold
          const possibleEmails = generateEnhancedEmailVariations(contact.name, companyDomain);
          attemptedPatterns[contact.name] = possibleEmails;

          for (const email of possibleEmails) {
            // More aggressive validation
            const validationScore = validateEmailEnhanced(email);
            if (validationScore >= 65 && !isPlaceholderEmail(email)) {
              predictedEmails.push(email);
              crossReferencedResults[email] = validationScore;
            }
          }
        }
      }

      // Separate email collection
      const uniqueEmails = [...new Set(predictedEmails)];

      // Sort emails by validation score
      const sortedEmails = uniqueEmails.sort((a, b) => 
        (crossReferencedResults[b] || 0) - (crossReferencedResults[a] || 0)
      );

      return {
        source: "enhanced_pattern_prediction",
        emails: sortedEmails,
        metadata: {
          searchDate: new Date().toISOString(),
          domain: companyDomain,
          patternsAttempted: attemptedPatterns,
          nameValidationScores: validationResults,
          emailValidationScores: crossReferencedResults,
          totalPredictions: Object.values(attemptedPatterns).flat().length,
          validPredictions: sortedEmails.length
        }
      };
    } catch (error) {
      console.error('Enhanced pattern prediction error:', error);
      return {
        source: "enhanced_pattern_prediction",
        emails: [],
        metadata: {
          searchDate: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          domain: companyDomain
        }
      };
    }
  }
};