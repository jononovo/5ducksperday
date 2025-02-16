import { linkedinSearch } from './linkedin-search';
import { twitterSearch } from './twitter-search';
import { facebookSearch } from './facebook-search';
import type { SearchModule } from '../../shared/types';

export const socialSourcesModule: SearchModule = {
  name: "Social Sources",
  description: "Search social media platforms",
  searches: [linkedinSearch, twitterSearch, facebookSearch],
  config: {
    subsearches: {},
    searchOptions: {
      ignoreFranchises: false,
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

export * from './linkedin-search';
export * from './twitter-search';
export * from './facebook-search';
