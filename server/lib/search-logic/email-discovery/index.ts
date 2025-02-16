export * from './types';
export * from './service';
export * from './strategies/website-crawler';

// Re-export the singleton service instance as the default export
export { emailDiscoveryService as default } from './service';
