import type { Contact } from "@shared/schema";
import { validateName } from "./contact-name-validation";
import { isPlaceholderEmail, isValidBusinessEmail } from "./email-analysis";
import { validateNames, combineValidationScores } from "./contact-ai-name-scorer";

// Common business email formats
const EMAIL_FORMATS = [
  (first: string, last: string) => `${first}.${last}`,
  (first: string, last: string) => `${first[0]}${last}`,
  (first: string, last: string) => `${first}${last[0]}`,
  (first: string, last: string) => `${first}`,
  (first: string, last: string) => `${last}`,
  (first: string, last: string) => `${first[0]}.${last}`
];

export function generatePossibleEmails(name: string, domain: string): string[] {
  const nameParts = name.toLowerCase().split(/\s+/);
  if (nameParts.length < 2) return [];

  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];

  return EMAIL_FORMATS.map(format =>
    `${format(firstName, lastName)}@${domain}`
  );
}

export function extractDomainFromContext(text: string): string | null {
  const domainPattern = /(?:@|http:\/\/|https:\/\/|www\.)([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/;
  const match = text.match(domainPattern);
  return match ? match[1] : null;
}

const placeholderNames = new Set([
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'test user', 'demo user', 'example user'
]);

export const isPlaceholderName = (name: string): boolean => placeholderNames.has(name.toLowerCase());

interface ValidationOptions {
  minimumScore?: number;
  searchPrompt?: string;
  searchTermPenalty?: number;
}

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

        // Use AI score in validation
        const aiScore = aiScores[name] || 50;
        console.log(`Processing contact "${name}" with AI score: ${aiScore}`);

        const validationResult = validateName(name, contextWindow, companyName, {
          ...validationOptions,
          aiScore
        });

        if (validationResult.score >= (validationOptions.minimumScore || 30)) {
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

          console.log(`Adding contact "${name}" with final score: ${validationResult.score}`);
          contacts.push({
            name,
            email: emailsArray.length > 0 ? emailsArray[0] : null,
            role,
            probability: validationResult.score,
            nameConfidenceScore: validationResult.score,
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