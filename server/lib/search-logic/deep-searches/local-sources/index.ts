import { newsSearch } from './news-search';
import type { SearchModule } from '../../shared/types';

export const localSourcesModule: SearchModule = {
  name: "Local Sources",
  description: "Search local sources for company and contact information",
  searches: [newsSearch],
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
