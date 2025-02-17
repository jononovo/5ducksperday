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

  // Decision Maker specific subsections
  leadershipSearch: {
    id: "leadership-search",
    label: "Leadership Team",
    description: "Search for company leadership and decision makers",
    implementation: "Search leadership profiles and roles"
  },
  roleVerification: {
    id: "role-verification",
    label: "Role Verification",
    description: "Verify roles and responsibilities",
    implementation: "Validate decision maker roles"
  },

  // Email Discovery Subsections - based on email discovery module strategies
  websiteEmailSearch: {
    id: "website-email-search",
    label: "Website Email Search",
    description: "Extract email addresses from company website and related pages",
    implementation: "Search company website and pages for email addresses"
  },
  publicDirectorySearch: {
    id: "public-directory-search",
    label: "Public Directory Search",
    description: "Search public business directories and listing sites",
    implementation: "Search public directories for company email addresses"
  },
  patternPredictionSearch: {
    id: "pattern-prediction-search",
    label: "Pattern Prediction",
    description: "Predict email addresses based on common corporate patterns",
    implementation: "Analyze and predict company email patterns"
  },
  domainAnalysisSearch: {
    id: "domain-analysis-search",
    label: "Domain Analysis",
    description: "Analyze domain MX records and email configurations",
    implementation: "Analyze company domain for email configuration"
  },
  socialProfileSearch: {
    id: "social-profile-search",
    label: "Social Profile Search",
    description: "Extract email addresses from public social media profiles",
    implementation: "Search social media profiles for email addresses"
  },
  localBusinessAssociations: {
    id: "local-business-search",
    label: "Local Business Associations",
    description: "Search local business associations for top prospect emails",
    implementation: "Search local business associations for contact details"
  },
  localEventsSearch: {
    id: "local-events-search",
    label: "Local Events Search",
    description: "Search local business events and conferences for contact discovery",
    implementation: "Search local event listings for company mentions and contact details"
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
  decision_maker: {
    leadership_search: {
      id: "leadership_search",
      label: "Leadership Search",
      description: "Search and verify company leadership",
      subsectionIds: ["leadership-search", "role-verification"]
    }
  },
  email_discovery: {
    basic_discovery: {
      id: "basic_discovery",
      label: "Basic Discovery",
      description: "Basic email discovery methods",
      subsectionIds: [
        "website-email-search",
        "public-directory-search",
        "pattern-prediction-search",
        "domain-analysis-search"
      ]
    },
    advanced_discovery: {
      id: "advanced_discovery",
      label: "Advanced Discovery",
      description: "Advanced and social discovery methods",
      subsectionIds: [
        "social-profile-search",
        "local-business-search",
        "local-events-search"
      ]
    }
  },
  contact_deepdive: {
    local_sources: {
      id: "local_sources",
      label: "Local Sources",
      description: "Search local sources for company and contact information",
      subsectionRef: "EMAIL_DEEPDIVE_SECTIONS.local_sources"
    },
    digital_sources: {
      id: "digital_sources",
      label: "Digital Sources",
      description: "Search digital platforms for company presence",
      subsectionRef: "EMAIL_DEEPDIVE_SECTIONS.digital_sources"
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
      const subsection = SEARCH_SUBSECTIONS[id as keyof typeof SEARCH_SUBSECTIONS];
      if (!subsection) {
        console.warn(`Subsection ${id} not found`);
        return null;
      }
      return subsection;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// Helper function to get searches based on subsection reference
function getSearchesFromSubsectionRef(subsectionRef: string): Array<{
  id: string;
  label: string;
  description: string;
  implementation?: string;
}> {
  const [configName, sectionId] = subsectionRef.split('.');

  // For now, we'll only handle EMAIL_DEEPDIVE_SECTIONS -  This needs a definition elsewhere
  if (configName === 'EMAIL_DEEPDIVE_SECTIONS') {
    // Placeholder -  EMAIL_DEEPDIVE_SECTIONS needs to be defined elsewhere
    const section = {searches: []}; // Placeholder - replace with actual data fetching
    return section?.searches || [];
  }

  return [];
}

// Get sections for a specific module type with strict type checking
export function getSectionsByModuleType(moduleType: string): Record<string, SearchSection> {
  if (!['company_overview', 'decision_maker', 'email_discovery', 'contact_deepdive'].includes(moduleType)) {
    console.warn(`Invalid module type: ${moduleType}`);
    return {};
  }

  const moduleConfig = SECTIONS_CONFIG[moduleType as keyof typeof SECTIONS_CONFIG];
  if (!moduleConfig) {
    console.warn(`No config found for module type: ${moduleType}`);
    return {};
  }

  const result: Record<string, SearchSection> = {};

  Object.entries(moduleConfig).forEach(([sectionId, sectionConfig]) => {
    const searches = sectionConfig.subsectionRef
      ? getSearchesFromSubsectionRef(sectionConfig.subsectionRef)
      : getSubsectionsForSection(sectionConfig);

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