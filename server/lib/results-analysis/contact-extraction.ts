import type { Contact } from "@shared/schema";
import { validateNameLocally, type ValidationOptions, combineValidationScores } from "./contact-name-validation";
import { isPlaceholderEmail, isValidBusinessEmail } from "./email-analysis";
import { validateNames } from "../api-interactions";

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

          const emailMatches: string[] = [];
          emailRegex.lastIndex = 0;
          while ((match = emailRegex.exec(result)) !== null) {
            const email = match[0];
            if (!isPlaceholderEmail(email)) {
              const emailLower = email.toLowerCase();
              const nameParts = name.toLowerCase().split(/\s+/);
              if (isValidBusinessEmail(email) ||
                  nameParts.some(part => part.length >= 2 && emailLower.includes(part))) {
                emailMatches.push(email);
              }
            }
          }

          contacts.push({
            name,
            email: emailMatches[0] || null,
            role,
            probability: finalScore,
            nameConfidenceScore: finalScore,
            lastValidated: new Date()
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