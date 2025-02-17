import type { SearchSection } from '@shared/schema';

export const EMAIL_DEEPDIVE_SECTIONS = {
  local_sources: {
    id: 'local_sources',
    label: 'Local Sources',
    description: 'Search local sources for company and contact information',
    searches: [
      {
        id: 'local-news-search',
        label: 'Local News Search',
        description: 'Search local news sources for company leadership mentions and activities',
        implementation: 'Search local news for [COMPANY] leadership mentions'
      },
      {
        id: 'business-associations-search',
        label: 'Business Associations Search',
        description: 'Search local chambers of commerce and business association memberships',
        implementation: 'Search business associations for [COMPANY] memberships'
      },
      {
        id: 'local-events-search',
        label: 'Local Events Search',
        description: 'Search local business events, conferences, and speaking engagements',
        implementation: 'Search local events and conferences for [COMPANY] participation'
      },
      {
        id: 'local-classifieds-search',
        label: 'Local Classifieds Search',
        description: 'Search classifieds for company info and local classifieds',
        implementation: 'Search local classifieds for [COMPANY] listings'
      }
    ]
  },
  digital_sources: {
    id: 'digital_sources',
    label: 'Digital Sources',
    description: 'Search digital platforms for company presence',
    searches: [
      {
        id: 'gmb-search',
        label: 'Google My Business',
        description: 'Search Google My Business listings and reviews',
        implementation: 'Search GMB for [COMPANY] profile and reviews'
      },
      {
        id: 'yelp-search',
        label: 'Yelp Search',
        description: 'Check for Yelp business profile and reviews',
        implementation: 'Search Yelp for [COMPANY] listing and reviews'
      }
    ]
  }
};

// Export type for type safety
export type SubsectionConfig = Record<string, SearchSection>;
