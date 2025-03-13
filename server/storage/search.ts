import { PgDatabase } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import {
  type SearchApproach,
  type InsertSearchApproach,
  searchApproaches
} from '@shared/schema';

export class SearchStorage {
  constructor(private db: PgDatabase<any>) {}

  async getSearchApproach(id: number): Promise<SearchApproach | undefined> {
    const [approach] = await this.db
      .select()
      .from(searchApproaches)
      .where(eq(searchApproaches.id, id));
    return approach;
  }

  async listSearchApproaches(): Promise<SearchApproach[]> {
    return this.db.select().from(searchApproaches).orderBy(searchApproaches.order);
  }

  async createSearchApproach(approach: InsertSearchApproach): Promise<SearchApproach> {
    const [created] = await this.db
      .insert(searchApproaches)
      .values(approach)
      .returning();
    return created;
  }

  async updateSearchApproach(
    id: number,
    updates: Partial<SearchApproach>,
  ): Promise<SearchApproach | undefined> {
    const [updated] = await this.db
      .update(searchApproaches)
      .set(updates)
      .where(eq(searchApproaches.id, id))
      .returning();
    return updated;
  }

  async initializeDefaultSearchApproaches() {
    const existing = await this.listSearchApproaches();
    if (existing.length === 0) {
      const defaultApproaches: InsertSearchApproach[] = [
        {
          name: "Small Business Contacts",
          prompt: "Target key decision makers in small businesses",
          order: 0,
          active: true,
          moduleType: "company_overview",
          sequence: {
            modules: ['company_overview', 'decision_maker', 'email_discovery'],
            moduleConfigs: {
              company_overview: {
                subsearches: { 'small-business-validation': true },
                searchOptions: { 
                  ignoreFranchises: true,
                  locallyHeadquartered: true
                }
              },
              decision_maker: {
                subsearches: { 'owner-identification': true },
                searchOptions: { requireRole: true }
              },
              email_discovery: {
                subsearches: { 
                  'direct-contact-discovery': true,
                  'pattern-prediction-search': true
                },
                searchOptions: { 
                  validatePatterns: true,
                  useEnhancedValidation: false
                }
              }
            },
            validationStrategy: 'moderate'
          },
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              requiredFields: ["name", "role"],
              scoreThresholds: { roleConfidence: 75 },
              minimumConfidence: 75
            }
          },
          validationRules: {}
        },
        {
          name: "Enhanced Contact Discovery",
          prompt: "Improved contact discovery with advanced validation and enhanced email detection",
          order: 1,
          active: true,
          moduleType: "email_discovery",
          sequence: {
            modules: ['company_overview', 'decision_maker', 'email_discovery'],
            moduleConfigs: {
              company_overview: {
                subsearches: { 'small-business-validation': true },
                searchOptions: { 
                  ignoreFranchises: true,
                  locallyHeadquartered: true
                }
              },
              decision_maker: {
                subsearches: { 'owner-identification': true, 'enhanced-name-validation': true },
                searchOptions: { 
                  requireRole: true,
                  enhancedNameValidation: true,
                  minimumNameScore: 70
                }
              },
              email_discovery: {
                subsearches: { 
                  'direct-contact-discovery': true, 
                  'enhanced-pattern-prediction-search': true,
                  'domain-analysis-search': true
                },
                searchOptions: { 
                  validatePatterns: true,
                  useEnhancedValidation: true,
                  enhancedValidation: true,
                  crossReferenceValidation: true
                }
              }
            },
            validationStrategy: 'strict'
          },
          config: {
            subsearches: {
              'enhanced-pattern-prediction-search': true,
              'enhanced-name-validation': true
            },
            searchOptions: {
              useEnhancedValidation: true,
              enhancedValidation: true,
              crossReferenceValidation: true
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["name", "role"],
              scoreThresholds: { 
                roleConfidence: 80,
                nameConfidence: 75,
                emailConfidence: 70
              },
              minimumConfidence: 80
            }
          },
          validationRules: {
            nameValidation: {
              minimumScore: 75,
              preferFullNames: true,
              filterGenericNames: true
            },
            emailValidation: {
              minimumPatternScore: 70,
              domainCheck: true,
              crossReferenceValidation: true
            }
          },
          completedSearches: [
            'enhanced-pattern-prediction-search',
            'domain-analysis-search',
            'website-email-search'
          ]
        },
        {
          name: "Contractor Search",
          prompt: "Find independent contractors and freelance professionals",
          order: 2,
          active: true,
          moduleType: "company_overview",
          sequence: { 
            modules: ['company_overview', 'decision_maker'],
            validationStrategy: 'moderate'
          },
          config: {
            validationRules: {
              minimumConfidence: 70
            }
          },
          validationRules: {}
        },
        {
          name: "Medium Business Leadership",
          prompt: "Focus on leadership teams in medium-sized companies",
          order: 3,
          active: true,
          moduleType: "company_overview",
          sequence: { 
            modules: ['company_overview', 'decision_maker', 'email_discovery'],
            validationStrategy: 'strict'
          },
          config: {
            validationRules: {
              minimumConfidence: 80
            }
          },
          validationRules: {}
        },
        {
          name: "Corporate Employees",
          prompt: "Search for corporate employees across departments",
          order: 4,
          active: true,
          moduleType: "company_overview",
          sequence: { 
            modules: ['company_overview', 'decision_maker', 'email_discovery'],
            validationStrategy: 'lenient'
          },
          config: {
            validationRules: {
              minimumConfidence: 60
            }
          },
          validationRules: {}
        },
        {
          name: "Rural Business Search",
          prompt: "Target businesses in rural and small-town locations",
          order: 5,
          active: true,
          moduleType: "company_overview",
          sequence: { 
            modules: ['company_overview', 'decision_maker'],
            validationStrategy: 'moderate'
          },
          config: {
            validationRules: {
              minimumConfidence: 70
            }
          },
          validationRules: {}
        }
      ];

      for (const approach of defaultApproaches) {
        await this.createSearchApproach(approach);
      }
    }
  }
}