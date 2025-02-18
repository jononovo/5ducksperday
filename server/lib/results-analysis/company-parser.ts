import type { Company } from "@shared/schema";
import { analyzeCompanySize, analyzeDifferentiators, calculateCompanyScore } from "./company-analysis";

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
    country: null
  };

  try {
    for (const result of analysisResults) {
      console.log('\nParsing API result:', result);

      try {
        // Try parsing JSON first
        const jsonData = JSON.parse(result);
        console.log('Parsed JSON:', JSON.stringify(jsonData, null, 2));

        // Handle the new structured response format
        if (jsonData.companyProfile) {
          const profile = jsonData.companyProfile;

          // Extract website with validation
          if (profile.website && typeof profile.website === 'string') {
            const cleanedUrl = cleanUrl(profile.website);
            if (cleanedUrl) {
              console.log('Found valid website URL:', cleanedUrl);
              companyData.website = cleanedUrl;
            }
          }

          // Extract other fields
          if (profile.services && Array.isArray(profile.services)) {
            companyData.services = profile.services.slice(0, 5);
          }

          if (profile.size) {
            companyData.size = typeof profile.size === 'number' 
              ? profile.size 
              : analyzeCompanySize(profile.size.toString());
          }

          // Extract location data
          if (profile.location) {
            if (profile.location.city) companyData.city = profile.location.city;
            if (profile.location.state) companyData.state = profile.location.state;
            if (profile.location.country) companyData.country = profile.location.country;
          }
        }
      } catch (jsonError) {
        console.error('JSON parsing failed, attempting regex extraction:', jsonError);

        // Fallback to regex parsing
        const websitePatterns = [
          /(?:website|url):\s*(https?:\/\/[^\s,}"']+)/i,
          /(?:website|url):\s*([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\.[a-zA-Z]{2,})/i
        ];

        for (const pattern of websitePatterns) {
          const match = result.match(pattern);
          if (match && !companyData.website) {
            const cleanedUrl = cleanUrl(match[1]);
            if (cleanedUrl) {
              console.log('Found website URL via regex:', cleanedUrl);
              companyData.website = cleanedUrl;
              break;
            }
          }
        }
      }
    }

    // Calculate score if not set
    if (!companyData.totalScore) {
      companyData.totalScore = calculateCompanyScore(companyData);
    }

    console.log('Final parsed company data:', JSON.stringify(companyData, null, 2));
    return companyData;

  } catch (error) {
    console.error('Error parsing company data:', error);
    return companyData;
  }
}