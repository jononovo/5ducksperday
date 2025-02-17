import type { SearchSection } from "@shared/schema";

// All possible search subsections
export const SEARCH_SUBSECTIONS = {
  // Company Overview specific subsections
  ignoreFranchises: {
    id: "ignore-franchises",
    label: "Ignore Franchises",
    description: "Exclude franchise businesses from search results"
  },
  localHq: {
    id: "local-hq",
    label: "Locally Headquartered",
    description: "Only include companies with local headquarters"
  },

  // Email Discovery specific subsections
  emailPatternAnalysis: {
    id: "email-pattern-analysis",
    label: "Email Pattern Analysis",
    description: "Analyze company email patterns and formats",
    implementation: "Analyze common email patterns used by [COMPANY] including format validation and pattern detection",
    technicalPrompt: `Analyze the company's email patterns by:
1. Examining known email addresses
2. Identifying common formats (firstname.lastname, firstinitial.lastname, etc.)
3. Validating against domain MX records
4. Checking email server configurations

Format response as:
{
  "patterns": string[],
  "confidence": number,
  "validationStatus": boolean
}`,
    responseStructure: {
      patterns: "string[] - list of detected email patterns",
      confidence: "number - confidence score for pattern detection",
      validationStatus: "boolean - whether patterns were validated"
    }
  },
  domainValidation: {
    id: "domain-validation",
    label: "Domain Validation",
    description: "Validate company email domains",
    implementation: "Verify email domain configuration and validate MX records for [COMPANY]",
    technicalPrompt: `Analyze the company's email domain by:
1. Checking MX records
2. Verifying SPF and DKIM settings
3. Testing email server responses
4. Validating domain ownership

Format response as:
{
  "domain": string,
  "mxRecords": boolean,
  "spfValid": boolean,
  "serverResponding": boolean
}`,
    responseStructure: {
      domain: "string - company email domain",
      mxRecords: "boolean - MX records exist and are valid",
      spfValid: "boolean - SPF records are properly configured",
      serverResponding: "boolean - email server responds correctly"
    }
  },
  publicEmailSearch: {
    id: "public-email-search",
    label: "Public Email Search",
    description: "Search public sources for email addresses",
    implementation: "Search public sources and verify email addresses for [COMPANY] contacts",
    technicalPrompt: `Search for company email addresses by:
1. Crawling company website
2. Checking public directories
3. Analyzing social profiles
4. Verifying discovered emails

Format response as:
{
  "emails": [{
    "address": string,
    "source": string,
    "verified": boolean,
    "confidence": number
  }]
}`,
    responseStructure: {
      emails: [{
        address: "string - discovered email address",
        source: "string - where the email was found",
        verified: "boolean - verification status",
        confidence: "number - confidence score (0-100)"
      }]
    }
  },
  emailVerification: {
    id: "email-verification",
    label: "Email Verification",
    description: "Verify discovered email addresses",
    implementation: "Validate discovered email addresses for [COMPANY] through multiple verification methods",
    technicalPrompt: `Verify each email address by:
1. Format validation
2. Domain verification
3. Mailbox existence check
4. Spam trap detection

Format response as:
{
  "verifications": [{
    "email": string,
    "isValid": boolean,
    "methods": string[],
    "score": number
  }]
}`,
    responseStructure: {
      verifications: [{
        email: "string - email address being verified",
        isValid: "boolean - overall validity status",
        methods: "string[] - verification methods used",
        score: "number - verification confidence score"
      }]
    }
  },

  // Decision Maker specific subsections
  linkedinSearch: {
    id: "linkedin-search",
    label: "LinkedIn Analysis",
    description: "Search for company decision makers on LinkedIn",
    implementation: "Search LinkedIn for company executives and decision makers at [COMPANY]"
  },
  twitterSearch: {
    id: "twitter-search",
    label: "Twitter Analysis",
    description: "Analyze Twitter for executive activity",
    implementation: "Find Twitter accounts of executives at [COMPANY]"
  },
  industryDb: {
    id: "industry-db",
    label: "Industry Database Search",
    description: "Search industry-specific databases",
    implementation: "Search industry databases for key decision makers at [COMPANY]"
  },
  professionalOrgs: {
    id: "professional-orgs",
    label: "Professional Organizations",
    description: "Search professional organization memberships",
    implementation: "Find professional organization memberships for [COMPANY] executives"
  },
  newsMentions: {
    id: "news-mentions",
    label: "News Mentions",
    description: "Search news articles for executive mentions",
    implementation: "Find recent news articles mentioning [COMPANY] executives or leadership"
  },

  // Add Local Sources subsections
  localBusinessAssociations: {
    id: "local-business-associations-search",
    label: "Local Business Associations",
    description: "Search local chambers of commerce and business association memberships",
    implementation: "Search local business associations for company contacts and email patterns",
    technicalPrompt: `Search local business associations by:
1. Checking chamber of commerce directories
2. Searching business association member lists
3. Analyzing local business networks
4. Cross-referencing with local events

Format response as:
{
  "associations": [{
    "name": string,
    "contacts": [{
      "name": string,
      "role": string,
      "email": string | null
    }],
    "confidence": number
  }]
}`,
    responseStructure: {
      associations: [{
        name: "string - association name",
        contacts: [{
          name: "string - contact name",
          role: "string - position in association",
          email: "string | null - contact email if available"
        }],
        confidence: "number - confidence score (0-100)"
      }]
    }
  },

  localClassifieds: {
    id: "local-classifieds-search",
    label: "Local Classifieds",
    description: "Search local business classifieds for contact information",
    implementation: "Search local classifieds for business contact details and email patterns",
    technicalPrompt: `Search local classifieds by:
1. Scanning business listings
2. Analyzing contact information
3. Validating business details
4. Cross-referencing with local directories

Format response as:
{
  "listings": [{
    "source": string,
    "contacts": [{
      "name": string,
      "email": string | null,
      "verified": boolean
    }],
    "confidence": number
  }]
}`,
    responseStructure: {
      listings: [{
        source: "string - classifieds source",
        contacts: [{
          name: "string - contact name",
          email: "string | null - contact email",
          verified: "boolean - verification status"
        }],
        confidence: "number - confidence score (0-100)"
      }]
    }
  }
};

// Section definitions for each module type
export const SECTIONS_CONFIG = {
  company_overview: {
    search_options: {
      id: "search_options",
      label: "Search Options",
      description: "Configure additional search parameters",
      subsectionIds: ["ignore-franchises", "local-hq"]
    }
  },
  email_discovery: {
    pattern_analysis: {
      id: "pattern_analysis",
      label: "Email Pattern Analysis",
      description: "Analyze email patterns and formats",
      subsectionIds: ["email-pattern-analysis", "domain-validation"]
    },
    discovery: {
      id: "discovery",
      label: "Email Discovery",
      description: "Methods for discovering email addresses",
      subsectionIds: ["public-email-search", "email-verification", "local-business-associations-search"]
    }
  },
  decision_maker: {
    social_networks: {
      id: "social_networks",
      label: "Social Network Analysis",
      description: "Search social networks for decision maker profiles",
      subsectionIds: ["linkedin-search", "twitter-search"]
    },
    professional_databases: {
      id: "professional_databases",
      label: "Professional Database Search",
      description: "Search professional and industry databases",
      subsectionIds: ["industry-db", "professional-orgs"]
    },
    news_media: {
      id: "news_media",
      label: "News and Media Analysis",
      description: "Analyze news and media mentions",
      subsectionIds: ["news-mentions"]
    }
  },
  local_sources: {
    local_business: {
      id: "local_business",
      label: "Local Business Sources",
      description: "Search local business sources for contact information",
      subsectionIds: ["local-business-associations-search", "local-classifieds-search"]
    }
  }
};

// Get relevant subsection details for a specific section
export function getSubsectionsForSection(sectionConfig: {
  id: string;
  label: string;
  description: string;
  subsectionIds: string[];
}): Array<{
  id: string;
  label: string;
  description: string;
  implementation?: string;
}> {
  return sectionConfig.subsectionIds
    .map(id => {
      const subsection = Object.values(SEARCH_SUBSECTIONS).find(s => s.id === id);
      if (!subsection) {
        console.warn(`Subsection ${id} not found`);
        return null;
      }
      return subsection;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// Get sections for a specific module type with strict type checking
export function getSectionsByModuleType(moduleType: string): Record<string, SearchSection> {
  if (!['company_overview', 'email_discovery', 'decision_maker', 'local_sources'].includes(moduleType)) {
    console.warn(`Invalid module type: ${moduleType}`);
    return {};
  }

  const moduleConfig = SECTIONS_CONFIG[moduleType as keyof typeof SECTIONS_CONFIG];
  if (!moduleConfig) {
    console.warn(`No config found for module type: ${moduleType}`);
    return {};
  }

  const result: Record<string, SearchSection> = {};

  // Only process sections defined for this specific module type
  Object.entries(moduleConfig).forEach(([sectionId, sectionConfig]) => {
    const searches = getSubsectionsForSection(sectionConfig);

    // Only add the section if it has valid searches
    if (searches.length > 0) {
      result[sectionId] = {
        id: sectionConfig.id,
        label: sectionConfig.label,
        description: sectionConfig.description,
        searches
      };
    }
  });

  return result;
}

// Get all possible search IDs for a module type
export function getAllSearchIds(moduleType: string): string[] {
  const moduleConfig = SECTIONS_CONFIG[moduleType as keyof typeof SECTIONS_CONFIG];
  return moduleConfig ? Object.values(moduleConfig).flatMap(section => section.subsectionIds) : [];
}