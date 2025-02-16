import { localSourcesModule } from './local-sources';
import { startupSourcesModule } from './startup-sources';
import { sectorListingsModule } from './sector-listings';

export const deepSearchModules = {
  localSources: localSourcesModule,
  startupSources: startupSourcesModule,
  sectorListings: sectorListingsModule
};

export * from './local-sources';
export * from './startup-sources';
export * from './sector-listings';
