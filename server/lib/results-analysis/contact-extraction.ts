import type { Contact } from "@shared/schema";
import { validateNameLocally, type ValidationOptions, combineValidationScores } from "./contact-name-validation";
import { isPlaceholderEmail, isValidBusinessEmail } from "./email-analysis";
import { validateNames } from "../api-interactions";

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

function extractDomainFromContext(text: string): string | null {
  const domainPattern = /(?:@|http:\/\/|https:\/\/|www\.)([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})/;
  const match = text.match(domainPattern);
  return match ? match[1] : null;
}

export async function extractContacts(
  analysisResults: string[],
  validationOptions?: ValidationOptions
): Promise<Partial<Contact>[]> {
  if (!Array.isArray(analysisResults)) {
    console.warn('analysisResults is not an array, returning empty array');
    return [];
  }

  const contacts: Partial<Contact>[] = [];
  const nameRegex = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const roleRegex = /(?:is|as|serves\s+as)\s+(?:the|a|an)\s+([^,.]+?(?:Manager|Director|Officer|Executive|Lead|Head|Chief|Founder|Owner|President|CEO|CTO|CFO))/gi;

  const placeholderNames = new Set([
    'john doe', 'jane doe', 'john smith', 'jane smith',
    'test user', 'demo user', 'example user'
  ]);

  try {
    for (const result of analysisResults) {
      if (typeof result !== 'string') continue;

      // Extract company domain from context
      const domain = extractDomainFromContext(result);

      let match;
      const names = [];
      while ((match = nameRegex.exec(result)) !== null) {
        const name = match[0];
        if (!placeholderNames.has(name.toLowerCase())) {
          names.push(name);
        }
      }

      if (names.length === 0) continue;

      const aiScores = await validateNames(names);

      for (const name of names) {
        const aiScore = aiScores[name] || 0;
        const localResult = validateNameLocally(name, result);
        const finalScore = combineValidationScores(aiScore, localResult, validationOptions);

        if (finalScore >= 30) {
          const nameIndex = result.indexOf(name);
          const contextWindow = result.slice(
            Math.max(0, nameIndex - 100),
            nameIndex + 200
          );

          let role = null;
          roleRegex.lastIndex = 0;
          const roleMatch = roleRegex.exec(contextWindow);
          if (roleMatch) {
            role = roleMatch[1].trim();
          }

          // Enhanced email discovery
          const emailMatches = new Set<string>();

          // 1. Direct email matches from text
          emailRegex.lastIndex = 0;
          while ((match = emailRegex.exec(result)) !== null) {
            const email = match[0].toLowerCase();
            if (!isPlaceholderEmail(email) && isValidBusinessEmail(email)) {
              emailMatches.add(email);
            }
          }

          // 2. Generate potential business emails if domain found
          if (domain) {
            const predictedEmails = generatePossibleEmails(name, domain);
            for (const email of predictedEmails) {
              if (isValidBusinessEmail(email) && !isPlaceholderEmail(email)) {
                emailMatches.add(email);
              }
            }
          }

          // 3. Match name parts with found emails
          const nameParts = name.toLowerCase().split(/\s+/);
          emailRegex.lastIndex = 0;
          while ((match = emailRegex.exec(result)) !== null) {
            const email = match[0].toLowerCase();
            if (!isPlaceholderEmail(email) &&
                nameParts.some(part => part.length >= 2 && email.includes(part))) {
              emailMatches.add(email);
            }
          }

          const emailsArray = Array.from(emailMatches);

          contacts.push({
            name,
            email: emailsArray.length > 0 ? emailsArray[0] : null,
            role,
            probability: finalScore,
            nameConfidenceScore: finalScore,
            lastValidated: new Date(),
            alternativeEmails: emailsArray.slice(1)  // Store additional found emails
          });
        }
      }
    }

    return Array.isArray(contacts) ?
      contacts
        .sort((a, b) => (b.probability || 0) - (a.probability || 0))
        .filter((contact, index, self) =>
          index === self.findIndex(c => c.name === contact.name)
        ) :
      [];

  } catch (error) {
    console.error('Error in contact extraction:', error);
    return [];
  }
}