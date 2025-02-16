import { newsSearch } from './news-search';
import { businessAssociationsSearch } from './business-associations-search';
import { localEventsSearch } from './local-events-search';
import { localClassifiedsSearch } from './local-classifieds-search';
import type { SearchModule } from '../../shared/types';

export const localSourcesModule: SearchModule = {
  name: "Local Sources",
  description: "Search local sources for company and contact information",
  searches: [
    newsSearch,
    businessAssociationsSearch,
    localEventsSearch,
    localClassifiedsSearch
  ],
  config: {
    subsearches: {},
    searchOptions: {
      ignoreFranchises: false,
      locallyHeadquartered: true
    },
    searchSections: {},
    validationRules: {
      requiredFields: ['content', 'confidence'],
      scoreThresholds: {
        minConfidence: 0.5
      },
      minimumConfidence: 50
    }
  }
};

export * from './news-search';
export * from './business-associations-search';
export * from './local-events-search';
export * from './local-classifieds-search';