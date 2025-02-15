import type { Company } from "@shared/schema";

// Company-specific analysis functions
export function analyzeCompanySize(result: string): number | null {
  if (result.includes("employees") || result.includes("staff")) {
    const sizeMatch = result.match(/(\d+)[\s-]*(?:\d+)?\s*(employees|staff)/i);
    if (sizeMatch) {
      const numbers = sizeMatch[1].split('-').map(n => parseInt(n.trim()));
      return Math.max(...numbers.filter(n => !isNaN(n)));
    }
  }
  return null;
}

export function analyzeDifferentiators(result: string): string[] {
  if (result.toLowerCase().includes("different") || result.toLowerCase().includes("unique")) {
    return result
      .split(/[.!?•]/)
      .map(s => s.trim())
      .filter(s =>
        s.length > 0 &&
        s.length < 100 &&
        (s.toLowerCase().includes("unique") ||
          s.toLowerCase().includes("only") ||
          s.toLowerCase().includes("leading"))
      )
      .slice(0, 3);
  }
  return [];
}

export function isFranchise(companyName: string): boolean {
  const franchiseKeywords = ['franchise', 'franchising', 'franchisee'];
  return franchiseKeywords.some(keyword => 
    companyName.toLowerCase().includes(keyword)
  );
}

export function isLocalHeadquarter(companyName: string): boolean {
  // Enhanced local headquarters detection logic could be implemented here
  // For now, returning true as per original implementation
  return true;
}

export function calculateCompanyScore(companyData: Partial<Company>): number {
  let score = 50;
  if (companyData.size && companyData.size > 50) score += 10;
  if (companyData.differentiation && companyData.differentiation.length > 0) score += 20;
  if (companyData.services && companyData.services.length > 0) score += 20;
  return Math.min(100, score);
}
