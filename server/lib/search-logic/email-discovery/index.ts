import type { SearchModule } from '../../shared/types';
import { websiteCrawlerStrategy } from './strategies/website-crawler';
import { patternPredictionStrategy } from './strategies/pattern-prediction';
import { domainAnalysisStrategy } from './strategies/domain-analysis';
import { publicDirectoryStrategy } from './strategies/public-directory';
import { socialProfileStrategy } from './strategies/social-profile';

// Export module configuration
export const emailDiscoveryModule = {
  id: "email_discovery",
  label: "Email Discovery",
  description: "Multi-source email discovery and verification",
  searches: [
    {
      id: "website-email-search",
      label: "Website Email Search",
      description: "Extract email addresses from company website and related pages",
      implementation: websiteCrawlerStrategy
    },
    {
      id: "public-directory-search",
      label: "Public Directory Search", 
      description: "Search public business directories and listing sites",
      implementation: publicDirectoryStrategy
    },
    {
      id: "social-profile-search",
      label: "Social Profile Search",
      description: "Extract email addresses from public social media profiles",
      implementation: socialProfileStrategy
    },
    {
      id: "pattern-prediction-search",
      label: "Pattern Prediction",
      description: "Predict email addresses based on common corporate patterns",
      implementation: patternPredictionStrategy
    },
    {
      id: "domain-analysis-search",
      label: "Domain Analysis",
      description: "Analyze domain MX records and email configurations",
      implementation: domainAnalysisStrategy
    }
  ]
};

// Re-export all strategy implementations
export * from './strategies/website-crawler';
export * from './strategies/pattern-prediction';
export * from './strategies/domain-analysis';
export * from './strategies/public-directory';
export * from './strategies/social-profile';

// Re-export types and service
export * from './types';
export * from './service';

// Re-export the singleton service instance as the default export
export { emailDiscoveryService as default } from './service';