import type { Company } from "@shared/schema";

// New utility functions for company name processing
export function stripCompanySummary(companyName: string): string {
  // Remove text after dash/hyphen if it looks like a description
  const dashSplit = companyName.split(/\s*[-–—]\s*/);
  if (dashSplit.length > 1) {
    // Check if what follows the dash is a description (more than 3 words)
    const afterDash = dashSplit.slice(1).join(' ').trim();
    if (afterDash.split(/\s+/).length > 3) {
      return dashSplit[0].trim();
    }
  }
  return companyName.trim();
}

export function cleanCompanyName(companyName: string): string {
  // Remove numbered prefixes (e.g., "1.", "2.", etc)
  let cleaned = companyName.replace(/^\d+\.\s*/, '');

  // Strip any summary text
  cleaned = stripCompanySummary(cleaned);

  // Remove extra whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

// Company-specific analysis functions
export function analyzeCompanySize(result: string): number | null {
  const sizePatterns = [
    /(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*(?:employees|staff)/i,
    /team of\s+(\d+(?:,\d+)?)/i,
    /staff size[:\s]+(\d+(?:,\d+)?)/i
  ];

  for (const pattern of sizePatterns) {
    const match = result.match(pattern);
    if (match) {
      const sizeText = match[1].replace(/,/g, '');
      const numbers = sizeText.split('-').map(n => parseInt(n.trim()));
      return Math.max(...numbers.filter(n => !isNaN(n)));
    }
  }
  return null;
}

export function analyzeDifferentiators(result: string): string[] {
  const differentiatorPatterns = [
    /uniquely/i,
    /different/i,
    /unique/i,
    /specialized in/i,
    /industry leader/i,
    /leading provider/i,
    /innovative/i
  ];

  const sentences = result
    .split(/[.!?]/)
    .map(s => s.trim())
    .filter(s => 
      s.length > 0 && 
      s.length < 200 &&
      differentiatorPatterns.some(pattern => pattern.test(s))
    );

  return sentences.slice(0, 3);
}

export function isFranchise(companyName: string): boolean {
  const franchiseKeywords = ['franchise', 'franchising', 'franchisee'];
  return franchiseKeywords.some(keyword => 
    companyName.toLowerCase().includes(keyword)
  );
}

export function isLocalHeadquarter(companyName: string): boolean {
  const hqIndicators = ['headquarters', 'hq', 'main office', 'corporate office'];
  return hqIndicators.some(indicator => 
    companyName.toLowerCase().includes(indicator)
  );
}

export function calculateCompanyScore(companyData: Partial<Company>): number {
  let score = 50; // Base score

  // Size scoring (up to 20 points)
  if (companyData.size) {
    if (companyData.size > 1000) score += 20;
    else if (companyData.size > 500) score += 15;
    else if (companyData.size > 100) score += 10;
    else if (companyData.size > 50) score += 5;
  }

  // Differentiators scoring (up to 15 points)
  if (companyData.differentiation?.length) {
    score += Math.min(companyData.differentiation.length * 5, 15);
  }

  // Services scoring (up to 15 points)
  if (companyData.services?.length) {
    score += Math.min(companyData.services.length * 3, 15);
  }

  // Ensure score stays within bounds
  return Math.min(100, Math.max(0, score));
}