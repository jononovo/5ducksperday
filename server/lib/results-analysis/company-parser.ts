import type { Company } from "@shared/schema";

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    differentiation: [],
    totalScore: 0
  };

  try {
    for (const result of analysisResults) {
      try {
        const jsonData = JSON.parse(result);
        if (jsonData.size && typeof jsonData.size === 'number') {
          companyData.size = jsonData.size;
        }
        if (jsonData.services) {
          companyData.services = jsonData.services;
        }
        continue;
      } catch (e) {
        // Fall back to text parsing
      }

      // Parse company size carefully
      if (result.includes("employees") || result.includes("staff")) {
        const sizeMatch = result.match(/(\d+)[\s-]*(?:\d+)?\s*(employees|staff)/i);
        if (sizeMatch) {
          const numbers = sizeMatch[1].split('-').map(n => parseInt(n.trim()));
          companyData.size = Math.max(...numbers.filter(n => !isNaN(n)));
        }
      }

      // Extract differentiators
      if (result.toLowerCase().includes("different") || result.toLowerCase().includes("unique")) {
        const points = result
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

        if (points.length > 0) {
          companyData.differentiation = points;
        }
      }

      // Calculate score
      let score = 50;
      if (companyData.size && companyData.size > 50) score += 10;
      if (companyData.differentiation && companyData.differentiation.length > 0) score += 20;
      if (companyData.services && companyData.services.length > 0) score += 20;
      companyData.totalScore = Math.min(100, score);
    }
  } catch (error) {
    console.error('Error parsing company data:', error);
  }

  return companyData;
}
