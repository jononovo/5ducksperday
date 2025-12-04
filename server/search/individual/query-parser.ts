import type { ParsedIndividualQuery } from './types';

const LOCATION_PATTERNS = [
  /\bin\s+([A-Za-z\s,]+(?:UK|USA|US|CA|AU|DE|FR|IT|ES|NL|BE|CH|AT|SE|NO|DK|FI|IE|NZ|JP|CN|IN|BR|MX|SG|HK))/i,
  /\bin\s+([A-Za-z\s]+,\s*[A-Za-z\s]+)/i,
  /\bfrom\s+([A-Za-z\s,]+)/i,
  /\bbased\s+in\s+([A-Za-z\s,]+)/i,
  /\blocated\s+in\s+([A-Za-z\s,]+)/i,
];

const ROLE_PATTERNS = [
  /\b(CEO|CFO|CTO|COO|CMO|CIO|CISO|CPO|CDO|VP|Director|Manager|Head|Lead|Principal|Senior|Chief|Founder|Owner|Partner|President|Executive|Analyst|Engineer|Developer|Architect|Consultant|Specialist|Coordinator)\b/gi,
  /\b(Financial\s+Analyst|Software\s+Engineer|Product\s+Manager|Data\s+Scientist|Marketing\s+Director|Sales\s+Manager|HR\s+Director|Operations\s+Manager|Business\s+Development)\b/gi,
];

const COMPANY_PATTERNS = [
  /\bat\s+([A-Za-z0-9][A-Za-z0-9\s&.',-]*?)(?=\s+(?:in|as|who|where|formerly|currently|working|\d{4})|$)/i,
  /\bworking\s+(?:at|for)\s+([A-Za-z0-9][A-Za-z0-9\s&.',-]*?)(?=\s+(?:in|as|who|where|formerly|currently|\d{4})|$)/i,
  /\bformerly\s+(?:at|with)\s+([A-Za-z0-9][A-Za-z0-9\s&.',-]*?)(?=\s+(?:in|as|who|where|\d{4})|$)/i,
];

const KNOWN_LOCATIONS = new Set([
  'london', 'paris', 'berlin', 'madrid', 'rome', 'amsterdam', 'brussels',
  'new york', 'los angeles', 'chicago', 'san francisco', 'seattle', 'boston',
  'toronto', 'vancouver', 'sydney', 'melbourne', 'tokyo', 'singapore', 'hong kong',
  'mumbai', 'delhi', 'bangalore', 'shanghai', 'beijing', 'dubai', 'zurich', 'geneva',
  'uk', 'usa', 'us', 'france', 'germany', 'spain', 'italy', 'netherlands', 'belgium',
  'canada', 'australia', 'japan', 'india', 'china', 'brazil', 'mexico'
]);

const COMMON_NON_COMPANY_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'with', 'about', 'into',
  'their', 'our', 'your', 'his', 'her', 'my', 'its',
  'this', 'that', 'these', 'those', 'some', 'any', 'all', 'most'
]);

const PREPOSITIONS_TO_REMOVE = [
  'in', 'from', 'based in', 'located in', 'at', 'working at', 'working for',
  'currently at', 'formerly at', 'formerly with'
];

export function parseIndividualQuery(query: string): ParsedIndividualQuery {
  let workingQuery = query.trim();
  let locationHint: string | undefined;
  let roleHint: string | undefined;
  let companyHint: string | undefined;

  for (const pattern of LOCATION_PATTERNS) {
    const match = workingQuery.match(pattern);
    if (match && match[1]) {
      const potentialLocation = match[1].trim().toLowerCase();
      if (KNOWN_LOCATIONS.has(potentialLocation) || potentialLocation.includes(',')) {
        locationHint = match[1].trim();
        workingQuery = workingQuery.replace(match[0], ' ').trim();
        break;
      }
    }
  }

  for (const pattern of COMPANY_PATTERNS) {
    const match = workingQuery.match(pattern);
    if (match && match[1]) {
      const potentialCompany = match[1].trim();
      const lowerCompany = potentialCompany.toLowerCase();
      if (
        potentialCompany.length >= 2 && 
        !COMMON_NON_COMPANY_WORDS.has(lowerCompany) &&
        !KNOWN_LOCATIONS.has(lowerCompany)
      ) {
        companyHint = potentialCompany;
        workingQuery = workingQuery.replace(match[0], ' ').trim();
        break;
      }
    }
  }

  const roleMatches: string[] = [];
  for (const pattern of ROLE_PATTERNS) {
    const matches = workingQuery.match(pattern);
    if (matches) {
      roleMatches.push(...matches);
      for (const m of matches) {
        workingQuery = workingQuery.replace(m, ' ');
      }
    }
  }
  if (roleMatches.length > 0) {
    roleHint = roleMatches.join(' ').trim();
  }

  for (const prep of PREPOSITIONS_TO_REMOVE) {
    const regex = new RegExp(`\\b${prep}\\b`, 'gi');
    workingQuery = workingQuery.replace(regex, ' ');
  }

  workingQuery = workingQuery.replace(/[.,;:!?]+/g, ' ');
  workingQuery = workingQuery.replace(/\s+/g, ' ').trim();

  const personName = workingQuery || extractNameFallback(query);

  return {
    personName,
    companyHint,
    locationHint,
    roleHint,
    originalQuery: query.trim()
  };
}

function extractNameFallback(query: string): string {
  const words = query.trim().split(/\s+/);

  const nameWords: string[] = [];
  for (const word of words) {
    const cleaned = word.replace(/[^a-zA-Z'-]/g, '');
    if (cleaned.length >= 2 && /^[A-Z]/.test(cleaned)) {
      nameWords.push(cleaned);
      if (nameWords.length >= 3) break;
    }
  }

  return nameWords.join(' ') || words.slice(0, 2).join(' ');
}

export function formatSearchQuery(parsed: ParsedIndividualQuery): string {
  const parts: string[] = [parsed.personName];

  if (parsed.companyHint) {
    parts.push(parsed.companyHint);
  }

  if (parsed.locationHint) {
    parts.push(parsed.locationHint);
  }

  if (parsed.roleHint) {
    parts.push(parsed.roleHint);
  }

  return parts.join(' ');
}
