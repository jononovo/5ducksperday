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

// Helper function to clean and validate URLs
function cleanUrl(url: string): string | null {
  try {
    // Add protocol if missing
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }
    const urlObj = new URL(url);
    // Remove trailing slashes and unnecessary www
    return urlObj.toString().replace(/\/$/, '').replace(/^https?:\/\/www\./, 'https://');
  } catch {
    return null;
  }
}

// Add debug logging for website extraction
export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    differentiation: [],
    totalScore: 0,
    website: null,
    shortSummary: null,
    size: null,
    city: null,
    state: null,
    country: null,
    phone: null,
    defaultContactEmail: null
  };

  try {
    for (const result of analysisResults) {
      try {
        // Log the raw result for debugging
        console.log('Parsing result:', result);

        // Try parsing JSON first for structured data
        const jsonData = JSON.parse(result);
        console.log('Parsed JSON data:', JSON.stringify(jsonData, null, 2));

        if (jsonData.companyProfile || jsonData.company || jsonData.profile) {
          const profile = jsonData.companyProfile || jsonData.company || jsonData.profile;
          console.log('Found company profile:', JSON.stringify(profile, null, 2));

          // Extract website URL with multiple possible field names
          const possibleWebsiteFields = [
            profile.website,
            profile.websiteUrl,
            profile.url,
            profile.domain,
            profile.companyWebsite,
            profile.corporateWebsite
          ];

          console.log('Checking possible website fields:', possibleWebsiteFields);

          for (const websiteField of possibleWebsiteFields) {
            if (typeof websiteField === 'string' && !companyData.website) {
              const cleanedUrl = cleanUrl(websiteField);
              if (cleanedUrl) {
                console.log('Found valid website URL:', cleanedUrl);
                companyData.website = cleanedUrl;
                break;
              }
            }
          }

          // Extract other data
          if (profile.alternativeUrl) companyData.alternativeProfileUrl = cleanUrl(profile.alternativeUrl);
          if (profile.phone) companyData.phone = profile.phone;
          if (profile.email) companyData.defaultContactEmail = profile.email;
          if (profile.contactEmail) companyData.defaultContactEmail = profile.contactEmail;
          if (typeof profile.size === 'number') companyData.size = profile.size;
          if (profile.city) companyData.city = profile.city;
          if (profile.state) companyData.state = profile.state;
          if (profile.country) companyData.country = profile.country;

          // Handle arrays
          if (profile.services && Array.isArray(profile.services)) {
            const uniqueServices = new Set([...(companyData.services || [])]);
            profile.services.forEach((s: string) => uniqueServices.add(s));
            companyData.services = Array.from(uniqueServices);
          }

          if (profile.validationPoints && Array.isArray(profile.validationPoints)) {
            const uniqueValidationPoints = new Set([...(companyData.validationPoints || [])]);
            profile.validationPoints.forEach((v: string) => uniqueValidationPoints.add(v));
            companyData.validationPoints = Array.from(uniqueValidationPoints);
          }

          if (profile.differentiators && Array.isArray(profile.differentiators)) {
            const uniqueDifferentiators = new Set([...(companyData.differentiation || [])]);
            profile.differentiators.forEach((d: string) => uniqueDifferentiators.add(d));
            companyData.differentiation = Array.from(uniqueDifferentiators);
          }

          // Extract short summary
          if (profile.marketPosition) {
            companyData.shortSummary = profile.marketPosition.length > 150
              ? profile.marketPosition.substring(0, 147) + '...'
              : profile.marketPosition;
          } else if (profile.focus) {
            companyData.shortSummary = profile.focus.length > 150
              ? profile.focus.substring(0, 147) + '...'
              : profile.focus;
          }
        }
      } catch (e) {
        // Fallback to regex parsing for unstructured data
        const websitePatterns = [
          /(?:website|domain|url):\s*(https?:\/\/[^\s,}"']+)/i,
          /(?:website|domain|url):\s*([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,})/i,
          /visit\s+(?:us|them)\s+(?:at|on)\s+((?:https?:\/\/)?[^\s,}"']+)/i,
          /available\s+at\s+((?:https?:\/\/)?[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,})/i
        ];

        for (const pattern of websitePatterns) {
          const websiteMatch = result.match(pattern);
          if (websiteMatch && !companyData.website) {
            const cleanedUrl = cleanUrl(websiteMatch[1]);
            if (cleanedUrl) {
              companyData.website = cleanedUrl;
              break;
            }
          }
        }

        const phonePattern = /(?:phone|tel|telephone):\s*(\+?\d[\d\s-()]{8,})/i;
        const emailPattern = /(?:email|contact):\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
        const cityPattern = /(?:city|location):\s*([^,\n]+)/i;
        const statePattern = /(?:state|province):\s*([^,\n]+)/i;
        const countryPattern = /(?:country|nation):\s*([^,\n]+)/i;

        const phoneMatch = result.match(phonePattern);
        const emailMatch = result.match(emailPattern);
        const cityMatch = result.match(cityPattern);
        const stateMatch = result.match(statePattern);
        const countryMatch = result.match(countryPattern);

        if (phoneMatch && !companyData.phone) companyData.phone = phoneMatch[1];
        if (emailMatch && !companyData.defaultContactEmail) companyData.defaultContactEmail = emailMatch[1];
        if (cityMatch && !companyData.city) companyData.city = cityMatch[1];
        if (stateMatch && !companyData.state) companyData.state = stateMatch[1];
        if (countryMatch && !companyData.country) companyData.country = countryMatch[1];

        const size = analyzeCompanySize(result);
        if (size !== null && !companyData.size) {
          companyData.size = size;
        }

        // Extract arrays from text
        const servicesPattern = /(?:services|offerings|solutions):\s*([^.!?]+)/i;
        const validationPattern = /(?:validation|certifications|credentials):\s*([^.!?]+)/i;
        const differentiationPattern = /(?:differentiators|unique features|advantages):\s*([^.!?]+)/i;

        const servicesMatch = result.match(servicesPattern);
        const validationMatch = result.match(validationPattern);
        const differentiationMatch = result.match(differentiationPattern);

        if (servicesMatch && (!companyData.services || !companyData.services.length)) {
          companyData.services = servicesMatch[1].split(/,|\band\b/).map(s => s.trim());
        }

        if (validationMatch && (!companyData.validationPoints || !companyData.validationPoints.length)) {
          companyData.validationPoints = validationMatch[1].split(/,|\band\b/).map(v => v.trim());
        }

        if (differentiationMatch && (!companyData.differentiation || !companyData.differentiation.length)) {
          companyData.differentiation = differentiationMatch[1].split(/,|\band\b/).map(d => d.trim());
        }
      }
    }

    // Ensure arrays have reasonable lengths
    if (companyData.services) {
      companyData.services = companyData.services.slice(0, 5);
    }
    if (companyData.validationPoints) {
      companyData.validationPoints = companyData.validationPoints.slice(0, 3);
    }
    if (companyData.differentiation) {
      companyData.differentiation = companyData.differentiation.slice(0, 3);
    }

    // Calculate score if not set
    if (!companyData.totalScore) {
      companyData.totalScore = calculateCompanyScore(companyData);
    }

  } catch (error) {
    console.error('Error parsing company data:', error);
  }

  return companyData;
}