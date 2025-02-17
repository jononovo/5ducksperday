import { localSourcesModule } from './local-sources';
import { startupSourcesModule } from './startup-sources';
import { sectorListingsModule } from './sector-listings';
import { digitalSourcesModule } from './digital-sources';
import { socialSourcesModule } from './social-sources';
import { emailDiscoveryModule } from '../email-discovery';

// Align with the searchSections configuration from storage.ts
export const deepSearchModules = {
  local_sources: localSourcesModule,
  startup_sources: startupSourcesModule,
  sector_listings: sectorListingsModule,
  digital_sources: digitalSourcesModule,
  social_sources: socialSourcesModule,
  email_discovery: emailDiscoveryModule
};

// Map module IDs to their configurations from the database
export const moduleConfigurations = {
  local_sources: {
    id: "local_sources",
    label: "Local Sources",
    description: "Search local sources for contact email discovery",
    searches: [
      {
        id: "local-business-associations-search",
        label: "Local Business Associations",
        description: "Search business associations for contact email addresses",
        implementation: "Search business associations for [COMPANY] top prospect contacts",
        defaultEnabledFor: ['email_discovery'] 
      },
      {
        id: "local-classifieds-search",
        label: "Local Classifieds",
        description: "Search classifieds for company info and local classifieds",
        implementation: "Search local classifieds for [COMPANY] contact information"
      }
    ]
  },
  digital_sources: {
    id: "digital_sources",
    label: "Digital Sources",
    description: "Search digital platforms for company presence",
    searches: [
      {
        id: "gmb-search",
        label: "Google My Business",
        description: "Search Google My Business listings and reviews",
        implementation: "Search GMB for [COMPANY] listing"
      },
      {
        id: "yelp-search",
        label: "Yelp Search",
        description: "Check for Yelp business listings and reviews",
        implementation: "Search Yelp for [COMPANY] profile"
      }
    ]
  },
  social_sources: {
    id: "social_sources",
    label: "Social Sources",
    description: "Search social media platforms",
    searches: [
      {
        id: "linkedin-search",
        label: "LinkedIn Search",
        description: "Search LinkedIn for company profiles and employees",
        implementation: "Search LinkedIn for [COMPANY] profile and employees"
      },
      {
        id: "twitter-search",
        label: "Twitter Search",
        description: "Search Twitter for social mentions and engagement",
        implementation: "Search Twitter for [COMPANY] mentions"
      },
      {
        id: "facebook-search",
        label: "Facebook Search",
        description: "Search Facebook for social presence and community engagement",
        implementation: "Search Facebook for [COMPANY] presence"
      }
    ]
  },
  startup_sources: {
    id: "startup_sources",
    label: "Startup Sources",
    description: "Search startup-focused platforms",
    searches: [
      {
        id: "angellist-search",
        label: "Angellist",
        description: "Search Angellist for startup information and funding details",
        implementation: "Search Angellist for [COMPANY] profile"
      },
      {
        id: "crunchbase-search",
        label: "Crunchbase",
        description: "Search Crunchbase for company data and investment history",
        implementation: "Search Crunchbase for [COMPANY] data"
      }
    ]
  },
  sector_listings: {
    id: "sector_listings",
    label: "Sector Specific Listings",
    description: "Search sector-specific directories",
    searches: [
      {
        id: "tech-startup-listings",
        label: "Tech Startup",
        description: "Search for technology startup listings and directories",
        implementation: "Search tech startup directories for [COMPANY]"
      },
      {
        id: "small-business-listings",
        label: "Small Business",
        description: "Search for small business listings and directories",
        implementation: "Search small business directories for [COMPANY]"
      },
      {
        id: "contractor-listings",
        label: "Contractor",
        description: "Search for contractor and service provider listings",
        implementation: "Search contractor directories for [COMPANY]"
      }
    ]
  },
  email_discovery: emailDiscoveryModule
};

export * from './local-sources';
export * from './startup-sources';
export * from './sector-listings';
export * from './digital-sources';
export * from './social-sources';