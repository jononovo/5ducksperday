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
      // First try to parse as JSON
      try {
        const jsonData = JSON.parse(result);

        // Handle company size
        if (typeof jsonData.size === 'number' || typeof jsonData.employeeCount === 'number') {
          companyData.size = jsonData.size || jsonData.employeeCount;
        } else if (typeof jsonData.size === 'string' || typeof jsonData.employeeCount === 'string') {
          const size = analyzeCompanySize(jsonData.size || jsonData.employeeCount);
          if (size !== null) {
            companyData.size = size;
          }
        }

        // Handle services
        if (Array.isArray(jsonData.services)) {
          companyData.services = [...new Set([
            ...(companyData.services || []),
            ...jsonData.services.filter((s: unknown) => typeof s === 'string')
          ])];
        }

        // Handle differentiators
        if (Array.isArray(jsonData.differentiators) || Array.isArray(jsonData.uniquePoints)) {
          const points = jsonData.differentiators || jsonData.uniquePoints;
          if (points.length > 0) {
            companyData.differentiation = [...new Set([
              ...(companyData.differentiation || []),
              ...points.filter((p: unknown) => typeof p === 'string').slice(0, 3)
            ])];
          }
        }

        continue;
      } catch (e) {
        // Fall back to text analysis if JSON parsing fails
        console.log('Falling back to text analysis for result');
      }

      // Text analysis fallback
      const size = analyzeCompanySize(result);
      if (size !== null && !companyData.size) {
        companyData.size = size;
      }

      const differentiators = analyzeDifferentiators(result);
      if (differentiators.length > 0 && (!companyData.differentiation || companyData.differentiation.length === 0)) {
        companyData.differentiation = differentiators;
      }
    }

    // Calculate final score using all gathered data
    companyData.totalScore = calculateCompanyScore(companyData);
  } catch (error) {
    console.error('Error parsing company data:', error);
  }

  return companyData;
}