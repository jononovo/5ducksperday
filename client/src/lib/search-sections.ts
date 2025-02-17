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

// Get sections for a specific module type with strict type checking
export function getSectionsByModuleType(moduleType: string): Record<string, SearchSection> {
  if (!['company_overview', 'email_discovery'].includes(moduleType)) {
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
    const searches = getSubsectionsForSection(sectionConfig);
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