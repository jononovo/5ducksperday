import type { Contact } from "@shared/schema";

// Moved from contact-name-validation.ts
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
    /donotreply/i,
    /placeholder/i,
    /tempmail/i,
    /temp[._]?email/i
  ];
  return placeholderPatterns.some(pattern => pattern.test(email));
}

export function isValidBusinessEmail(email: string): boolean {
  const businessPatterns = [
    /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,  // Basic email format
    /^(?!support|info|sales|contact|help|admin|webmaster|postmaster).*@/i,  // Not generic addresses
    /^[a-z]{1,3}[._][a-z]+@/i,  // Initials pattern (e.g., j.smith@)
    /^[a-z]+\.[a-z]+@/i,  // firstname.lastname pattern
    /^[a-z]+[0-9]{0,2}@/i,  // name with optional numbers
    /^[a-z]+_[a-z]+@/i,  // underscore separated
  ];

  const isValidPattern = businessPatterns.some(pattern => pattern.test(email));

  const personalDomains = [
    '@gmail.com',
    '@yahoo.com',
    '@hotmail.com',
    '@outlook.com',
    '@aol.com',
    '@icloud.com'
  ];

  const isPersonalDomain = personalDomains.some(domain => 
    email.toLowerCase().endsWith(domain)
  );

  return isValidPattern && !isPersonalDomain;
}

export function validateEmailPattern(email: string): number {
  if (!email || typeof email !== 'string') return 0;

  let score = 0;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    score += 40;

    if (!/(@gmail\.com|@yahoo\.com|@hotmail\.com|@outlook\.com)$/i.test(email)) {
      score += 20;
    }

    if (/^[a-z]+\.[a-z]+@/i.test(email)) { // firstname.lastname
      score += 20;
    } else if (/^[a-z]{1,3}\.[a-z]+@/i.test(email)) { // f.lastname or fml.lastname
      score += 15;
    } else if (/^[a-z]+[0-9]{0,2}@/i.test(email)) { // name with optional numbers
      score += 10;
    }

    if (!/^(info|contact|support|sales|admin|office|help|team|general)@/i.test(email)) {
      score += 20;
    }

    const domain = email.split('@')[1];
    if (domain) {
      if (/^(gmail|yahoo|hotmail|outlook|aol|protonmail)\./i.test(domain)) {
        score -= 30;
      }

      if (/\.(com|net|org)$/i.test(domain)) {
        score += 10;
      }
    }
  }

  return Math.min(100, score);
}

export function parseEmailDetails(response: string): Partial<Contact> {
  const contact: Partial<Contact> = {};

  const emailMatch = response.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g);
  if (emailMatch) {
    const validEmails = emailMatch
      .filter(email => !isPlaceholderEmail(email))
      .sort((a, b) => {
        const scoreA = validateEmailPattern(a);
        const scoreB = validateEmailPattern(b);
        return scoreB - scoreA;
      });

    if (validEmails.length > 0) {
      contact.email = validEmails[0];
      if (validEmails.length > 1) {
        contact.alternativeEmails = validEmails.slice(1);
      }
    }
  }

  return contact;
}