import type { Contact } from "@shared/schema";
import { validateName, type ValidationOptions } from "./contact-name-validation";
import { isPlaceholderEmail, isValidBusinessEmail, generatePossibleEmails, extractDomainFromContext } from "./email-analysis";
import { validateNames, combineValidationScores } from "./contact-ai-name-scorer";
import { isPlaceholderName } from "./name-filters";

// Note: Common business email formats and email related functions are now imported from email-analysis.ts
// Domain extraction is also imported from email-analysis.ts

export async function extractContacts(
  analysisResults: string[],
  companyName?: string,
  validationOptions: ValidationOptions = {}
): Promise<Partial<Contact>[]> {
  if (!Array.isArray(analysisResults)) {
    console.warn('analysisResults is not an array, returning empty array');
    return [];
  }

  console.log('Starting contact extraction process');
  const contacts: Partial<Contact>[] = [];
  const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const roleRegex = /(?:is|as|serves\s+as)\s+(?:the|a|an)\s+([^,.]+?(?:Manager|Director|Officer|Executive|Lead|Head|Chief|Founder|Owner|President|CEO|CTO|CFO))/gi;

  try {
    // First pass: Extract all names for bulk validation
    const allNames: string[] = [];
    for (const result of analysisResults) {
      if (typeof result !== 'string') continue;
      nameRegex.lastIndex = 0;
      let nameMatch;
      while ((nameMatch = nameRegex.exec(result)) !== null) {
        const name = nameMatch[0];
        if (!isPlaceholderName(name)) {
          allNames.push(name);
        }
      }
    }

    console.log(`Found ${allNames.length} potential contact names for validation`);

    // Bulk validate all names with Perplexity AI
    console.log('Starting bulk AI validation');
    const aiScores = await validateNames(allNames, companyName, validationOptions.searchPrompt);
    console.log('Completed bulk AI validation');

    // Second pass: Process each result with AI scores
    for (const result of analysisResults) {
      if (typeof result !== 'string') continue;

      const domain = extractDomainFromContext(result);
      nameRegex.lastIndex = 0;
      let nameMatch;

      while ((nameMatch = nameRegex.exec(result)) !== null) {
        const name = nameMatch[0];
        if (isPlaceholderName(name)) continue;

        const nameIndex = result.indexOf(name);
        const contextWindow = result.slice(
          Math.max(0, nameIndex - 100),
          nameIndex + 200
        );

        // Use AI score in validation with improved weighting
        const aiScore = aiScores[name] || 50;
        console.log(`Processing contact "${name}" with AI score: ${aiScore}`);

        // Get pattern-based score
        const validationResult = validateName(name, contextWindow, companyName, {
          ...validationOptions
        });

        // Apply stricter validation rules
        const validationRules = {
          minimumScore: 60, // Increased from default 30
          searchTermPenalty: 35, // Increased from 25
          companyNamePenalty: 40 // Increased penalty
        };

        // Merge with provided options
        const finalOptions = {
          ...validationRules,
          ...validationOptions
        };

        // Combine AI and pattern-based scores with proper weighting
        const finalScore = combineValidationScores(
          aiScore,
          validationResult.score,
          {
            ...finalOptions,
            requireRole: true,
            roleMinimumScore: 40
          }
        );

        console.log(`Final combined score for "${name}": ${finalScore} (AI: ${aiScore}, Pattern: ${validationResult.score})`);

        if (finalScore >= (finalOptions.minimumScore || 30)) {
          roleRegex.lastIndex = 0;
          const roleMatch = roleRegex.exec(contextWindow);
          const role = roleMatch ? roleMatch[1].trim() : null;

          const emailMatches = new Set<string>();
          emailRegex.lastIndex = 0;
          let emailMatch;

          while ((emailMatch = emailRegex.exec(result)) !== null) {
            const email = emailMatch[0].toLowerCase();
            if (!isPlaceholderEmail(email) && isValidBusinessEmail(email)) {
              emailMatches.add(email);
            }
          }

          if (domain) {
            const predictedEmails = generatePossibleEmails(name, domain);
            for (const email of predictedEmails) {
              if (isValidBusinessEmail(email) && !isPlaceholderEmail(email)) {
                emailMatches.add(email);
              }
            }
          }

          const nameParts = name.toLowerCase().split(/\s+/);
          emailRegex.lastIndex = 0;

          while ((emailMatch = emailRegex.exec(result)) !== null) {
            const email = emailMatch[0].toLowerCase();
            if (!isPlaceholderEmail(email) &&
              nameParts.some(part => part.length >= 2 && email.includes(part))) {
              emailMatches.add(email);
            }
          }

          const emailsArray = Array.from(emailMatches);

          console.log(`Adding contact "${name}" with final score: ${finalScore}`);
          contacts.push({
            name,
            email: emailsArray.length > 0 ? emailsArray[0] : null,
            role,
            probability: finalScore,
            nameConfidenceScore: finalScore,
            lastValidated: new Date(),
            completedSearches: ['name_validation', 'ai_validation']
          });
        }
      }
    }

    const finalContacts = contacts
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .filter((contact, index, self) =>
        index === self.findIndex(c => c.name === contact.name)
      );

    console.log(`Extracted ${finalContacts.length} validated contacts`);
    return finalContacts;

  } catch (error) {
    console.error('Error in contact extraction:', error);
    return [];
  }
}