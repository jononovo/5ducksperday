import type { SearchModuleConfig, SearchSection, SearchImplementation } from '@shared/schema';
import { validateNames, extractContacts, searchCompanies, analyzeCompany, parseCompanyData } from './perplexity';
import type { Company, Contact } from '@shared/schema';

export interface SearchModuleResult {
  companies: Partial<Company>[];
  contacts: Partial<Contact>[];
  metadata: {
    moduleType: string;
    completedSearches: string[];
    validationScores: Record<string, number>;
  };
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
    const companies: Partial<Company>[] = [];
    const validationScores: Record<string, number> = {};

    try {
      // Base company search
      const companyNames = await searchCompanies(query);
      
      for (const name of companyNames) {
        const searchOptions = config.searchOptions || {};
        
        // Skip if it matches exclusion criteria
        if (searchOptions.ignoreFranchises && this.isFranchise(name)) continue;
        if (searchOptions.locallyHeadquartered && !this.isLocalHeadquarter(name)) continue;

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
    // Implement validation logic
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

  private isFranchise(companyName: string): boolean {
    // Implement franchise detection logic
    const franchiseKeywords = ['franchise', 'franchising', 'franchisee'];
    return franchiseKeywords.some(keyword => 
      companyName.toLowerCase().includes(keyword)
    );
  }

  private isLocalHeadquarter(companyName: string): boolean {
    // Implement local headquarters detection logic
    // This would need to be enhanced based on your specific requirements
    return true; // Default to true for now
  }
}

// Enhanced Decision Maker Module
export class DecisionMakerModule implements SearchModule {
  async execute({ query, config, previousResults }: SearchModuleContext): Promise<SearchModuleResult> {
    const companies = previousResults?.companies || [];
    const contacts: Partial<Contact>[] = [];
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

// Factory function to create appropriate module instance
export function createSearchModule(moduleType: string): SearchModule {
  switch (moduleType) {
    case 'company_overview':
      return new CompanyOverviewModule();
    case 'decision_maker':
      return new DecisionMakerModule();
    default:
      throw new Error(`Unknown module type: ${moduleType}`);
  }
}