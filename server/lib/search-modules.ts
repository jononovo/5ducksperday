import type { SearchModuleConfig, SearchSection, SearchImplementation } from '@shared/schema';
import { validateNames, extractContacts, searchCompanies, analyzeCompany, parseCompanyData, validateEmails } from './perplexity';
import type { Company, Contact } from '@shared/schema';
import { emailDiscoveryModule } from './search-logic/email-discovery';
import { validateEmailPattern, isValidBusinessEmail } from './results-analysis/email-analysis';

import { 
  analyzeCompanySize, 
  analyzeDifferentiators,
  calculateCompanyScore,
  isFranchise,
  isLocalHeadquarter 
} from './results-analysis/company-analysis';

import { localBusinessAssociationsSearch } from './search-logic/deep-searches/local-sources/local-business-associations-search';

// Define the structure of search module results
export interface SearchModuleResult {
  companies: Array<Partial<Company>>;
  contacts: Array<Partial<Contact>>;
  metadata: {
    moduleType: string;
    completedSearches: string[];
    validationScores: Record<string, number>;
  };
}

// Company Overview Module Configuration
export const COMPANY_OVERVIEW_MODULE = {
  type: 'company_overview',
  defaultPrompt: "Provide a detailed overview of [COMPANY], including its age, size, and main business focus.",
  technicalPrompt: `You are a business intelligence analyst. Analyze the company and provide structured information about:
    1. Company size (employee count)
    2. Core services offered
    3. Market positioning
    4. Key differentiators

    Format your response as JSON with the following structure:
    {
      "size": number,
      "services": string[],
      "marketPosition": string,
      "differentiators": string[]
    }`,
  responseStructure: {
    size: "number - employee count",
    services: "string[] - list of main services",
    marketPosition: "string - brief market position description",
    differentiators: "string[] - list of key differentiating factors"
  }
};

// Decision Maker Module Configuration
export const DECISION_MAKER_MODULE = {
  type: 'decision_maker',
  defaultPrompt: "Find key decision makers at [COMPANY], including their roles and contact information.",
  technicalPrompt: `You are a business contact researcher. For each identified decision maker, provide:
    1. Full name and title
    2. Department/division
    3. Professional contact details

    Format your response as JSON with the following structure:
    {
      "contacts": [
        {
          "name": string,
          "role": string,
          "department": string,
          "email": string | null,
          "linkedinUrl": string | null
        }
      ]
    }`,
  responseStructure: {
    contacts: [
      {
        name: "string - full name",
        role: "string - job title",
        department: "string - department name",
        email: "string | null - business email if found",
        linkedinUrl: "string | null - LinkedIn profile URL if found"
      }
    ]
  },
  validationRules: {
    minimumConfidence: 30,
    requireRole: true,
    requireDepartment: false
  }
};

// Email Discovery Module Configuration
export const EMAIL_DISCOVERY_MODULE = {
  type: 'email_discovery',
  defaultPrompt: "Discover and validate email addresses for contacts at [COMPANY]",
  technicalPrompt: `You are an email discovery specialist. For the given company and contacts:
    1. Analyze company domain and email patterns
    2. Search public sources for email addresses
    3. Validate discovered emails through multiple methods
    4. Assign confidence scores based on validation results

    Format your response as JSON with the following structure:
    {
      "discoveredEmails": [
        {
          "email": string,
          "contactName": string | null,
          "confidence": number,
          "source": string,
          "validationMethods": string[],
          "patternMatch": boolean
        }
      ],
      "emailPatterns": {
        "common": string[],
        "validated": boolean
      }
    }`,
  responseStructure: {
    discoveredEmails: [
      {
        email: "string - discovered email address",
        contactName: "string | null - associated contact name if known",
        confidence: "number - confidence score 0-100",
        source: "string - discovery source (e.g., website, directory, pattern)",
        validationMethods: "string[] - list of validation methods used",
        patternMatch: "boolean - matches company email pattern"
      }
    ],
    emailPatterns: {
      common: "string[] - detected company email patterns",
      validated: "boolean - pattern validation status"
    }
  },
  validationRules: {
    minimumConfidence: 50,
    requireValidation: true,
    validatePattern: true
  }
};

// Add Local Sources Module Configuration
export const LOCAL_SOURCES_MODULE = {
  type: 'local_sources',
  defaultPrompt: "Search local business associations and directories for contact information at [COMPANY]",
  technicalPrompt: `You are a local business researcher. Search local sources including:
    1. Chamber of commerce directories
    2. Local business associations
    3. Business networking groups
    4. Local trade organizations

    Format your response as JSON with the following structure:
    {
      "sources": [
        {
          "name": string,
          "type": string,
          "contacts": [{
            "name": string,
            "role": string,
            "email": string | null
          }]
        }
      ]
    }`,
  responseStructure: {
    sources: [
      {
        name: "string - source name (e.g., Chamber of Commerce)",
        type: "string - source type (e.g., business_association)",
        contacts: [
          {
            name: "string - contact name",
            role: "string - position/role",
            email: "string | null - contact email if available"
          }
        ]
      }
    ]
  },
  // Enable by default for email discovery
  defaultEnabledFor: ['email_discovery']
};

// All available search modules
export const SEARCH_MODULES = {
  company_overview: COMPANY_OVERVIEW_MODULE,
  decision_maker: DECISION_MAKER_MODULE,
  email_discovery: EMAIL_DISCOVERY_MODULE,
  local_sources: LOCAL_SOURCES_MODULE
};

// Helper function to get module configuration
export function getModuleConfig(moduleType: string): typeof COMPANY_OVERVIEW_MODULE | typeof DECISION_MAKER_MODULE | typeof EMAIL_DISCOVERY_MODULE | typeof LOCAL_SOURCES_MODULE {
  const module = SEARCH_MODULES[moduleType as keyof typeof SEARCH_MODULES];
  if (!module) {
    throw new Error(`Unknown module type: ${moduleType}`);
  }
  return module;
}

export interface SearchModuleContext {
  query: string;
  config: SearchModuleConfig;
  previousResults?: SearchModuleResult;
}

export interface SearchModule {
  execute(context: SearchModuleContext): Promise<SearchModuleResult>;
  validate(result: SearchModuleResult): Promise<boolean>;
  merge?(current: SearchModuleResult, previous?: SearchModuleResult): SearchModuleResult;
}

// Company Overview Module
export class CompanyOverviewModule implements SearchModule {
  async execute({ query, config }: SearchModuleContext): Promise<SearchModuleResult> {
    const completedSearches: string[] = [];
    const companies: Array<Partial<Company>> = [];
    const validationScores: Record<string, number> = {};

    try {
      // Base company search
      const companyNames = await searchCompanies(query);

      for (const name of companyNames) {
        const searchOptions = config.searchOptions || {};

        // Skip if it matches exclusion criteria
        if (searchOptions.ignoreFranchises && isFranchise(name)) continue;
        if (searchOptions.locallyHeadquartered && !isLocalHeadquarter(name)) continue;

        // Analyze based on enabled subsearches
        const analysisResults = await this.executeSubsearches(name, config);
        const companyData = parseCompanyData(analysisResults);

        if (companyData) {
          companies.push({
            name,
            ...companyData,
          });
          validationScores[name] = companyData.totalScore || 0;

          // Track completed searches
          completedSearches.push(...Object.keys(config.subsearches || {})
            .filter(key => config.subsearches?.[key]));
        }
      }

      return {
        companies,
        contacts: [], // Company overview doesn't handle contacts
        metadata: {
          moduleType: 'company_overview',
          completedSearches,
          validationScores
        }
      };
    } catch (error) {
      console.error('Error in CompanyOverviewModule:', error);
      throw error;
    }
  }

  async validate(result: SearchModuleResult): Promise<boolean> {
    const hasValidCompanies = result.companies.length > 0;
    const hasRequiredFields = result.companies.every(company =>
      company.name && company.services && company.services.length > 0
    );

    return hasValidCompanies && hasRequiredFields;
  }

  private async executeSubsearches(
    companyName: string,
    config: SearchModuleConfig
  ): Promise<string[]> {
    const results: string[] = [];
    const subsearches = config.subsearches || {};

    for (const [searchId, enabled] of Object.entries(subsearches)) {
      if (!enabled) continue;

      // Execute each enabled subsearch
      const section = Object.values(config.searchSections)
        .find(section => section.searches.some(search => search.id === searchId));

      if (section) {
        const search = section.searches.find(s => s.id === searchId);
        if (search?.implementation) {
          const result = await analyzeCompany(
            companyName,
            search.implementation,
            null,
            null
          );
          results.push(result);
        }
      }
    }

    return results;
  }
}

// Decision Maker Module
export class DecisionMakerModule implements SearchModule {
  async execute({ query, config, previousResults }: SearchModuleContext): Promise<SearchModuleResult> {
    const companies = previousResults?.companies || [];
    const contacts: Array<Partial<Contact>> = [];
    const completedSearches: string[] = [];
    const validationScores: Record<string, number> = {};

    try {
      for (const company of companies) {
        if (!company.name) continue;

        // Execute enabled social and professional network searches
        const subsearches = config.subsearches || {};
        const searchSections = config.searchSections || {};
        const searchResults: string[] = [];

        // Track which sections we've processed
        const processedSections = new Set<string>();

        for (const [searchId, enabled] of Object.entries(subsearches)) {
          if (!enabled) continue;

          const section = Object.values(searchSections)
            .find(section => section.searches.some(search => search.id === searchId));

          if (section && !processedSections.has(section.id)) {
            processedSections.add(section.id);

            // Execute all enabled searches in this section
            const enabledSearches = section.searches
              .filter(search => subsearches[search.id])
              .filter(search => search.implementation);

            for (const search of enabledSearches) {
              try {
                const result = await analyzeCompany(
                  company.name,
                  search.implementation!,
                  null,
                  null
                );
                searchResults.push(result);
                completedSearches.push(search.id);
              } catch (error) {
                console.error(`Failed to execute search ${search.id}:`, error);
              }
            }
          }
        }

        // Extract and validate contacts
        const extractedContacts = await extractContacts(searchResults);

        // Apply validation rules if specified
        const validatedContacts = extractedContacts.filter(contact => {
          const validationRules = config.validationRules || {};
          const minimumConfidence = validationRules.minimumConfidence || 0;

          return contact.probability && contact.probability >= minimumConfidence;
        });

        contacts.push(...validatedContacts);

        // Calculate validation scores
        for (const contact of validatedContacts) {
          if (contact.name) {
            validationScores[contact.name] = contact.probability || 0;
          }
        }
      }

      return {
        companies: [], // Decision maker module doesn't modify companies
        contacts,
        metadata: {
          moduleType: 'decision_maker',
          completedSearches,
          validationScores
        }
      };
    } catch (error) {
      console.error('Error in DecisionMakerModule:', error);
      throw error;
    }
  }

  async validate(result: SearchModuleResult): Promise<boolean> {
    return result.contacts.length > 0 &&
           result.contacts.every(contact =>
             contact.name &&
             contact.probability &&
             contact.probability >= 30
           );
  }

  merge(current: SearchModuleResult, previous?: SearchModuleResult): SearchModuleResult {
    if (!previous) return current;

    return {
      companies: previous.companies,
      contacts: [
        ...previous.contacts,
        ...current.contacts.filter(newContact =>
          !previous.contacts.some(existingContact =>
            existingContact.name === newContact.name
          )
        )
      ],
      metadata: {
        ...current.metadata,
        completedSearches: [
          ...(previous.metadata.completedSearches || []),
          ...(current.metadata.completedSearches || [])
        ],
        validationScores: {
          ...previous.metadata.validationScores,
          ...current.metadata.validationScores
        }
      }
    };
  }
}

// Email Discovery Module
export class EmailDiscoveryModule implements SearchModule {
  async execute({ query, config, previousResults }: SearchModuleContext): Promise<SearchModuleResult> {
    const companies = previousResults?.companies || [];
    const contacts: Array<Partial<Contact>> = [];
    const completedSearches: string[] = [];
    const validationScores: Record<string, number> = {};

    try {
      for (const company of companies) {
        if (!company.name || !company.website) continue;

        // Execute each enabled search strategy
        const subsearches = config.subsearches || {};
        const searchResults = [];

        for (const [searchId, enabled] of Object.entries(subsearches)) {
          if (!enabled) continue;

          const search = emailDiscoveryModule.searches.find(s => s.id === searchId);
          if (!search?.implementation) continue;

          try {
            const context = {
              companyName: company.name,
              companyWebsite: company.website,
              companyDomain: new URL(company.website).hostname,
              config,
              options: {
                timeout: 30000,
                maxDepth: 2
              }
            };

            // Execute the search implementation
            const result = await search.implementation.execute(context);
            if (result.emails?.length > 0) {
              // First pass: local validation
              const preValidatedEmails = result.emails.filter(email => {
                const patternScore = validateEmailPattern(email);
                return patternScore >= 50 && isValidBusinessEmail(email);
              });

              if (preValidatedEmails.length > 0) {
                // Add validated emails to contacts
                for (const email of preValidatedEmails) {
                  contacts.push({
                    companyId: company.id,
                    email,
                    name: null, // Could be enriched later
                    probability: result.metadata?.validationScore || 50,
                    verificationSource: search.label
                  });

                  validationScores[email] = result.metadata?.validationScore || 50;
                }
              }
            }

            completedSearches.push(searchId);
            searchResults.push(result);

          } catch (error) {
            console.error(`Failed to execute search ${searchId}:`, error);
          }
        }
      }

      return {
        companies: [], // Email discovery module doesn't modify companies
        contacts,
        metadata: {
          moduleType: 'email_discovery',
          completedSearches,
          validationScores
        }
      };

    } catch (error) {
      console.error('Error in EmailDiscoveryModule:', error);
      throw error;
    }
  }

  async validate(result: SearchModuleResult): Promise<boolean> {
    return result.contacts.length > 0 &&
           result.contacts.every(contact =>
             contact.email &&
             contact.probability &&
             contact.probability >= 30
           );
  }

  merge(current: SearchModuleResult, previous?: SearchModuleResult): SearchModuleResult {
    if (!previous) return current;

    return {
      companies: previous.companies,
      contacts: [
        ...previous.contacts,
        ...current.contacts.filter(newContact =>
          !previous.contacts.some(existingContact =>
            existingContact.email === newContact.email
          )
        )
      ],
      metadata: {
        ...current.metadata,
        completedSearches: [
          ...(previous.metadata.completedSearches || []),
          ...(current.metadata.completedSearches || [])
        ],
        validationScores: {
          ...previous.metadata.validationScores,
          ...current.metadata.validationScores
        }
      }
    };
  }
}

// Local Sources Module Implementation
export class LocalSourcesModule implements SearchModule {
  async execute({ query, config }: SearchModuleContext): Promise<SearchModuleResult> {
    const completedSearches: string[] = [];
    const contacts: Array<Partial<Contact>> = [];
    const validationScores: Record<string, number> = {};

    try {
      // Execute local business associations search
      const result = await localBusinessAssociationsSearch.execute({
        companyName: query,
        config: config,
        options: {
          timeout: 30000,
          maxDepth: 2
        }
      });

      // Process results
      if (result.length > 0) {
        completedSearches.push('local-business-associations-search');

        // Add any discovered contacts
        const sourceData = result[0].metadata;
        if (sourceData && sourceData.emailDiscoveryEnabled) {
          // Track this search was completed
          completedSearches.push('local-business-associations');
        }
      }

      return {
        companies: [], // Local sources module doesn't modify companies
        contacts,
        metadata: {
          moduleType: 'local_sources',
          completedSearches,
          validationScores
        }
      };
    } catch (error) {
      console.error('Error in LocalSourcesModule:', error);
      throw error;
    }
  }

  async validate(result: SearchModuleResult): Promise<boolean> {
    return result.metadata.completedSearches.length > 0;
  }
}

// Update factory function to include the new module
export function createSearchModule(moduleType: string): SearchModule {
  switch (moduleType) {
    case 'company_overview':
      return new CompanyOverviewModule();
    case 'decision_maker':
      return new DecisionMakerModule();
    case 'email_discovery':
      return new EmailDiscoveryModule();
    case 'local_sources':
      return new LocalSourcesModule();
    default:
      throw new Error(`Unknown module type: ${moduleType}`);
  }
}