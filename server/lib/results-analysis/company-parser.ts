import type { Company } from "@shared/schema";
import { analyzeCompanySize, analyzeDifferentiators, calculateCompanyScore } from "./company-analysis";

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

      // Parse company size using the analysis function
      const size = analyzeCompanySize(result);
      if (size !== null) {
        companyData.size = size;
      }

      // Extract differentiators using the analysis function
      const differentiators = analyzeDifferentiators(result);
      if (differentiators.length > 0) {
        companyData.differentiation = differentiators;
      }
    }

    // Calculate final score using the analysis function
    companyData.totalScore = calculateCompanyScore(companyData);
  } catch (error) {
    console.error('Error parsing company data:', error);
  }

  return companyData;
}