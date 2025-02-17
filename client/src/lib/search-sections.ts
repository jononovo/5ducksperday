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
    implementation: "Analyze email patterns used at [COMPANY]"
  },
  domainValidation: {
    id: "domain-validation",
    label: "Domain Validation",
    description: "Validate company email domains",
    implementation: "Validate email domains for [COMPANY]"
  },
  publicEmailSearch: {
    id: "public-email-search",
    label: "Public Email Search",
    description: "Search public sources for email addresses",
    implementation: "Search public sources for [COMPANY] email addresses"
  },
  emailVerification: {
    id: "email-verification",
    label: "Email Verification",
    description: "Verify discovered email addresses",
    implementation: "Verify email addresses for [COMPANY] contacts"
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
      subsectionIds: ["public-email-search", "email-verification"]
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
  if (!['company_overview', 'email_discovery', 'decision_maker'].includes(moduleType)) {
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