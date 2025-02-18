import type { Company } from "@shared/schema";
import { analyzeCompanySize, analyzeDifferentiators, calculateCompanyScore } from "./company-analysis";

// Helper function to extract location information from text
function extractLocationInfo(text: string): { city?: string; state?: string; country?: string } {
  const location: { city?: string; state?: string; country?: string } = {};

  // Common location patterns
  const cityPattern = /(?:located|based|headquarters|office)\s+in\s+([A-Za-z\s.]+?)(?:,|\s+(?:and|in|near))/i;
  const statePattern = /(?:,\s*|\sin\s+)([A-Za-z\s]+?)(?:,|\s+(?:and|in|near)|$)/i;
  const countryPattern = /(?:,\s*|\sin\s+)(United States|USA|US|Canada|[A-Za-z\s]+?)(?:\.|$)/i;

  const cityMatch = text.match(cityPattern);
  const stateMatch = text.match(statePattern);
  const countryMatch = text.match(countryPattern);

  if (cityMatch) location.city = cityMatch[1].trim();
  if (stateMatch) location.state = stateMatch[1].trim();
  if (countryMatch) location.country = countryMatch[1].trim();

  return location;
}

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    differentiation: [],
    totalScore: 0
  };

  try {
    for (const result of analysisResults) {
      // Text analysis first to ensure we don't miss anything
      const size = analyzeCompanySize(result);
      if (size !== null && !companyData.size) {
        companyData.size = size;
      }

      const differentiators = analyzeDifferentiators(result);
      if (differentiators.length > 0 && companyData.differentiation) {
        const uniqueDifferentiators = new Set([...companyData.differentiation]);
        differentiators.forEach(d => uniqueDifferentiators.add(d));
        companyData.differentiation = Array.from(uniqueDifferentiators);
      }

      // Extract location information from text
      const locationInfo = extractLocationInfo(result);
      if (locationInfo.city && !companyData.city) companyData.city = locationInfo.city;
      if (locationInfo.state && !companyData.state) companyData.state = locationInfo.state;
      if (locationInfo.country && !companyData.country) companyData.country = locationInfo.country;

      // Extract services using common patterns
      const servicePatterns = [
        /(?:provides?|offers?|delivers?|specializes? in)\s+([^.!?]+(?:services|solutions|consulting|development|support))/gi,
        /(?:key|main|core)\s+services?:\s*([^.!?]+)/gi,
        /services?(?:\s+include)?:\s*([^.!?]+)/gi
      ];

      for (const pattern of servicePatterns) {
        let match;
        while ((match = pattern.exec(result)) !== null) {
          const serviceText = match[1].trim();
          const services = serviceText
            .split(/,|\band\b/)
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.length < 100); // Reasonable length check

          if (services.length > 0 && companyData.services) {
            const uniqueServices = new Set([...companyData.services]);
            services.forEach(s => uniqueServices.add(s));
            companyData.services = Array.from(uniqueServices);
          }
        }
      }

      // Try JSON parsing for structured data
      try {
        const jsonData = JSON.parse(result);

        // Extract location information from JSON
        if (jsonData.location) {
          if (!companyData.city && jsonData.location.city) {
            companyData.city = jsonData.location.city;
          }
          if (!companyData.state && jsonData.location.state) {
            companyData.state = jsonData.location.state;
          }
          if (!companyData.country && jsonData.location.country) {
            companyData.country = jsonData.location.country;
          }
        }

        if (typeof jsonData.size === 'number' || typeof jsonData.employeeCount === 'number') {
          companyData.size = jsonData.size || jsonData.employeeCount;
        } else if (typeof jsonData.size === 'string' || typeof jsonData.employeeCount === 'string') {
          const size = analyzeCompanySize(jsonData.size || jsonData.employeeCount);
          if (size !== null) {
            companyData.size = size;
          }
        }

        if (Array.isArray(jsonData.services) && companyData.services) {
          const uniqueServices = new Set([...companyData.services]);
          jsonData.services
            .filter((s: unknown): s is string => typeof s === 'string')
            .forEach(s => uniqueServices.add(s));
          companyData.services = Array.from(uniqueServices);
        }

        if ((Array.isArray(jsonData.differentiators) || Array.isArray(jsonData.uniquePoints)) && companyData.differentiation) {
          const points = jsonData.differentiators || jsonData.uniquePoints;
          if (points.length > 0) {
            const uniqueDifferentiators = new Set([...companyData.differentiation]);
            points
              .filter((p: unknown): p is string => typeof p === 'string')
              .forEach(p => uniqueDifferentiators.add(p));
            companyData.differentiation = Array.from(uniqueDifferentiators);
          }
        }
      } catch (e) {
        // JSON parsing failed, continue with next result
        continue;
      }
    }

    // Calculate final score using all gathered data
    companyData.totalScore = calculateCompanyScore(companyData);

    // Ensure arrays are reasonably sized
    if (companyData.services) {
      companyData.services = companyData.services.slice(0, 5);
    }
    if (companyData.differentiation) {
      companyData.differentiation = companyData.differentiation.slice(0, 3);
    }

  } catch (error) {
    console.error('Error parsing company data:', error);
  }

  return companyData;
}