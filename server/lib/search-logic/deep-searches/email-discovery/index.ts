import { websiteEmailSearch } from './website-email-search';
import { publicDirectorySearch } from './public-directory-search';
import { socialProfileSearch } from './social-profile-search';
import { patternPredictionSearch } from './pattern-prediction-search';
import { domainAnalysisSearch } from './domain-analysis-search';

// Email discovery module configuration
export const emailDiscoveryModule = {
  id: "email_discovery",
  label: "Email Discovery",
  description: "Multi-source email discovery and verification",
  searches: [
    {
      id: "website-email-search",
      label: "Website Email Search",
      description: "Extract email addresses from company website and related pages",
      implementation: websiteEmailSearch
    },
    {
      id: "public-directory-search",
      label: "Public Directory Search", 
      description: "Search public business directories and listing sites",
      implementation: publicDirectorySearch
    },
    {
      id: "social-profile-search",
      label: "Social Profile Search",
      description: "Extract email addresses from public social media profiles",
      implementation: socialProfileSearch
    },
    {
      id: "pattern-prediction-search",
      label: "Pattern Prediction",
      description: "Predict email addresses based on common corporate patterns",
      implementation: patternPredictionSearch
    },
    {
      id: "domain-analysis-search",
      label: "Domain Analysis",
      description: "Analyze domain MX records and email configurations",
      implementation: domainAnalysisSearch
    }
  ]
};

export * from './website-email-search';
export * from './public-directory-search';
export * from './social-profile-search';
export * from './pattern-prediction-search';
export * from './domain-analysis-search';
