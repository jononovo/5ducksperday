import { angellistSearch } from './angellist-search';
import { crunchbaseSearch } from './crunchbase-search';
import type { SearchModule } from '../../shared/types';

export const startupSourcesModule: SearchModule = {
  name: "Startup Sources",
  description: "Search startup-focused platforms",
  searches: [angellistSearch, crunchbaseSearch],
  config: {
    subsearches: {},
    searchOptions: {
      ignoreFranchises: true,
      locallyHeadquartered: false
    },
    searchSections: {},
    validationRules: {
      requiredFields: ['content', 'confidence'],
      scoreThresholds: {
        minConfidence: 0.6
      },
      minimumConfidence: 60
    }
  }
};

export * from './angellist-search';
export * from './crunchbase-search';