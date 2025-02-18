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
    totalScore: 0,
    website: null
  };

  try {
    for (const result of analysisResults) {
      try {
        // Try parsing JSON first for structured data
        const jsonData = JSON.parse(result);

        if (jsonData.companyProfile) {
          // Extract from new structure
          const profile = jsonData.companyProfile;

          // Prioritize website extraction
          if (profile.website) {
            companyData.website = profile.website;
          }

          if (typeof profile.size === 'number') {
            companyData.size = profile.size;
          }

          if (profile.industry) {
            companyData.industry = profile.industry;
          }

          if (profile.focus) {
            companyData.focus = profile.focus;
          }

          if (profile.services && Array.isArray(profile.services)) {
            const uniqueServices = new Set([...(companyData.services || [])]);
            profile.services.forEach(s => uniqueServices.add(s));
            companyData.services = Array.from(uniqueServices);
          }

          if (profile.differentiators && Array.isArray(profile.differentiators) && companyData.differentiation) {
            const uniqueDifferentiators = new Set([...companyData.differentiation]);
            profile.differentiators.forEach(d => uniqueDifferentiators.add(d));
            companyData.differentiation = Array.from(uniqueDifferentiators);
          }

          if (profile.location) {
            if (profile.location.city) companyData.city = profile.location.city;
            if (profile.location.state) companyData.state = profile.location.state;
            if (profile.location.country) companyData.country = profile.location.country;
          }

          if (typeof profile.validationScore === 'number') {
            companyData.totalScore = profile.validationScore;
          }
        }
      } catch (e) {
        // JSON parsing failed, try to extract website using regex as fallback
        const websiteRegex = /(?:website|domain|url):\s*(https?:\/\/[^\s,}"']+)/i;
        const websiteMatch = result.match(websiteRegex);
        if (websiteMatch && !companyData.website) {
          companyData.website = websiteMatch[1];
        }

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

        // Extract location information from text as fallback
        const locationInfo = extractLocationInfo(result);
        if (locationInfo.city && !companyData.city) companyData.city = locationInfo.city;
        if (locationInfo.state && !companyData.state) companyData.state = locationInfo.state;
        if (locationInfo.country && !companyData.country) companyData.country = locationInfo.country;
      }
    }

    // Calculate final score if not already set
    if (!companyData.totalScore) {
      companyData.totalScore = calculateCompanyScore(companyData);
    }

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