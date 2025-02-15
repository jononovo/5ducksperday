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
  pressReleases: {
    id: "press-releases",
    label: "Press Release Analysis",
    description: "Analyze company press releases",
    implementation: "Search press releases from [COMPANY] for executive quotes and mentions"
  },
  companyWebsite: {
    id: "company-website",
    label: "Company Website Analysis",
    description: "Analyze company website for leadership info",
    implementation: "Extract leadership information from [COMPANY]'s website"
  },
  secFilings: {
    id: "sec-filings",
    label: "SEC Filing Analysis",
    description: "Search SEC filings for officer information",
    implementation: "Search SEC filings for [COMPANY] officer and director information"
  },
  emailValidation: {
    id: "email-validation",
    label: "Email Validation",
    description: "Verify extracted email addresses",
    implementation: "Validate email addresses for [COMPANY] contacts"
  },
  roleVerification: {
    id: "role-verification",
    label: "Role Verification",
    description: "Verify extracted roles and titles",
    implementation: "Verify roles and titles for [COMPANY] contacts"
  },

  // Local Sources
  localNewsSearch: {
    id: "local-news-search",
    label: "Local News Search",
    description: "Search local news sources for company leadership mentions and activities",
    implementation: "Search local news for [COMPANY] leadership mentions"
  },
  businessAssociations: {
    id: "business-associations-search",
    label: "Business Associations Search",
    description: "Search local chambers of commerce and business association memberships",
    implementation: "Search business associations for [COMPANY] memberships"
  },
  localEvents: {
    id: "local-events-search",
    label: "Local Events Search",
    description: "Search local business events, conferences, and speaking engagements",
    implementation: "Find [COMPANY] participation in local events"
  },
  localClassifieds: {
    id: "local-classifieds-search",
    label: "Local Classifieds or Lists",
    description: "Search classifieds for company info and local classifieds",
    implementation: "Search local classifieds for [COMPANY] information"
  },

  // Digital Sources
  gmbSearch: {
    id: "gmb-search",
    label: "Google My Business",
    description: "Search Google My Business listings and reviews",
    implementation: "Search GMB for [COMPANY] listing"
  },
  yelpSearch: {
    id: "yelp-search",
    label: "Yelp Search",
    description: "Check for Yelp",
    implementation: "Search Yelp for [COMPANY] profile"
  },

  // Social Sources
  facebookSearch: {
    id: "facebook-search",
    label: "Facebook Search",
    description: "Search Facebook for social presence and community engagement",
    implementation: "Search Facebook for [COMPANY] presence"
  },

  // Startup Sources
  angelistSearch: {
    id: "angellist-search",
    label: "Angelist",
    description: "Search Angelist for startup information and funding details",
    implementation: "Search Angellist for [COMPANY] profile"
  },
  crunchbaseSearch: {
    id: "crunchbase-search",
    label: "Crunchbase",
    description: "Search Crunchbase for company data and investment history",
    implementation: "Search Crunchbase for [COMPANY] data"
  },
  otherStartupSources: {
    id: "other-startup-sources",
    label: "Other Sources",
    description: "Search other startup-focused platforms and databases",
    implementation: "Search startup databases for [COMPANY]"
  },

  // Sector Specific Listings
  techStartupListings: {
    id: "tech-startup-listings",
    label: "Tech Startup",
    description: "Search for technology startup listings and directories",
    implementation: "Search tech startup directories for [COMPANY]"
  },
  smallBusinessListings: {
    id: "small-business-listings",
    label: "Small Business",
    description: "Search for small business listings and directories",
    implementation: "Search small business directories for [COMPANY]"
  },
  contractorListings: {
    id: "contractor-listings",
    label: "Contractor",
    description: "Search for contractor and service provider listings",
    implementation: "Search contractor directories for [COMPANY]"
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
    social_networks: {
      id: "social_networks",
      label: "Social Network Analysis",
      description: "Search social networks for decision maker profiles",
      subsectionIds: ["linkedin-search", "twitter-search", "facebook-search"]
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
      subsectionIds: ["news-mentions", "press-releases"]
    },
    corporate_sources: {
      id: "corporate_sources",
      label: "Corporate Source Analysis",
      description: "Analyze corporate documentation",
      subsectionIds: ["company-website", "sec-filings"]
    },
    validation: {
      id: "validation",
      label: "Contact Validation",
      description: "Validate extracted contact information",
      subsectionIds: ["email-validation", "role-verification"]
    },
    local_sources: {
      id: "local_sources",
      label: "Local Sources",
      description: "Search local sources for company and contact information",
      subsectionIds: ["local-news-search", "business-associations-search", "local-events-search", "local-classifieds-search"]
    },
    digital_sources: {
      id: "digital_sources",
      label: "Digital Sources",
      description: "Search digital platforms for company presence",
      subsectionIds: ["gmb-search", "yelp-search"]
    },
    social_sources: {
      id: "social_sources",
      label: "Social Sources",
      description: "Search social media platforms",
      subsectionIds: ["linkedin-search", "twitter-search", "facebook-search"]
    },
    startup_sources: {
      id: "startup_sources",
      label: "Startup Sources",
      description: "Search startup-focused platforms",
      subsectionIds: ["angellist-search", "crunchbase-search", "other-startup-sources"]
    },
    sector_listings: {
      id: "sector_listings",
      label: "Sector Specific Listings",
      description: "Search sector-specific directories",
      subsectionIds: ["tech-startup-listings", "small-business-listings", "contractor-listings"]
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

// Get sections for a specific module type
export function getSectionsByModuleType(moduleType: string): Record<string, SearchSection> {
  const moduleConfig = SECTIONS_CONFIG[moduleType as keyof typeof SECTIONS_CONFIG];
  if (!moduleConfig) return {};

  const result: Record<string, SearchSection> = {};

  Object.entries(moduleConfig).forEach(([sectionId, sectionConfig]) => {
    const searches = getSubsectionsForSection(sectionConfig);

    result[sectionId] = {
      id: sectionConfig.id,
      label: sectionConfig.label,
      description: sectionConfig.description,
      searches
    };
  });

  return result;
}

// Get all possible search IDs for a module type
export function getAllSearchIds(moduleType: string): string[] {
  const moduleConfig = SECTIONS_CONFIG[moduleType as keyof typeof SECTIONS_CONFIG];
  return moduleConfig ? Object.values(moduleConfig).flatMap(section => section.subsectionIds) : [];
}