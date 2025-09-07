import type { Contact } from "@shared/schema";
import { validateNames, combineValidationScores } from "../../results-analysis/contact-ai-name-scorer";

export function isPlaceholderEmail(email: string): boolean {
  const placeholderPatterns = [
    /first[._]?name/i,
    /last[._]?name/i,
    /first[._]?initial/i,
    /company(domain)?\.com$/i,
    /example\.com$/i,
    /domain\.com$/i,
    /test[._]?user/i,
    /demo[._]?user/i,
    /noreply/i,
    /donotreply/i
  ];
  return placeholderPatterns.some(pattern => pattern.test(email));
}

export function isValidBusinessEmail(email: string): boolean {
  const businessPatterns = [
    /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,  // Basic email format
    /^(?!support|info|sales|contact|help|admin|webmaster|postmaster).*@/i,  // Not generic addresses
    /^[a-z]{1,3}[._][a-z]+@/i,  // Initials pattern (e.g., j.smith@)
    /^[a-z]+\.[a-z]+@/i,  // firstname.lastname pattern
  ];
  return businessPatterns.some(pattern => pattern.test(email));
}

export function parseEmailDetails(response: string): Partial<Contact> {
  const contact: Partial<Contact> = {};

  // Extract email with context
  const emailMatch = response.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g);
  if (emailMatch) {
    // Filter and sort emails by business relevance
    const validEmails = emailMatch
      .filter(email => !isPlaceholderEmail(email))
      .sort((a, b) => {
        const scoreA = validateEmailPattern(a);
        const scoreB = validateEmailPattern(b);
        return scoreB - scoreA;
      });

    if (validEmails.length > 0) {
      contact.email = validEmails[0];
    }
  }

  return contact;
}

export function validateEmailPattern(email: string): number {
  if (!email || typeof email !== 'string') return 0;

  let score = 0;

  // Basic email format check
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    score += 40;

    // Business domain patterns
    if (!/(@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com)$/i.test(email)) {
      score += 20;
    }

    // Name pattern checks
    if (/^[a-z]+\.[a-z]+@/i.test(email)) { // firstname.lastname
      score += 20;
    } else if (/^[a-z]{1,3}\.[a-z]+@/i.test(email)) { // f.lastname or fml.lastname
      score += 15;
    } else if (/^[a-z]+[0-9]{0,2}@/i.test(email)) { // name with optional numbers
      score += 10;
    }

    // No generic prefixes
    if (!/^(info|contact|support|sales|admin|office|help|team|general)@/i.test(email)) {
      score += 20;
    }

    // Domain reputation check
    const domain = email.split('@')[1];
    if (domain) {
      // Penalize free email providers
      if (/^(gmail|yahoo|hotmail|outlook|aol|protonmail)\./i.test(domain)) {
        score -= 30;
      }

      // Bonus for .com/.net/.org domains
      if (/\.(com|net|org)$/i.test(domain)) {
        score += 10;
      }
    }
  }

  return Math.min(100, score);
}