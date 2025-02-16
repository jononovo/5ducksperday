import { techStartupListingsSearch } from './tech-startup-search';
import { smallBusinessSearch } from './small-business-search';
import { contractorSearch } from './contractor-search';
import type { SearchModule } from '../../shared/types';

export const sectorListingsModule: SearchModule = {
  name: "Sector Specific Listings",
  description: "Search sector-specific directories",
  searches: [techStartupListingsSearch, smallBusinessSearch, contractorSearch],
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

export * from './tech-startup-search';
export * from './small-business-search';
export * from './contractor-search';