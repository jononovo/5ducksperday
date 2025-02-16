import { localSourcesModule } from './local-sources';
import { startupSourcesModule } from './startup-sources';
import { sectorListingsModule } from './sector-listings';
import { digitalSourcesModule } from './digital-sources';
import { socialSourcesModule } from './social-sources';

export const deepSearchModules = {
  localSources: localSourcesModule,
  startupSources: startupSourcesModule,
  sectorListings: sectorListingsModule,
  digitalSources: digitalSourcesModule,
  socialSources: socialSourcesModule
};

export * from './local-sources';
export * from './startup-sources';
export * from './sector-listings';
export * from './digital-sources';
export * from './social-sources';