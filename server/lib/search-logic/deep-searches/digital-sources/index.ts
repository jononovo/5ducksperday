import { gmbSearch } from './gmb-search';
import { yelpSearch } from './yelp-search';
import type { SearchModule } from '../../shared/types';

export const digitalSourcesModule: SearchModule = {
  name: "Digital Sources",
  description: "Search digital platforms for company presence",
  searches: [gmbSearch, yelpSearch],
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
        minConfidence: 0.6
      },
      minimumConfidence: 60
    }
  }
};

export * from './gmb-search';
export * from './yelp-search';
