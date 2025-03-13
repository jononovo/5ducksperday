import { PgDatabase } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
import {
  type SearchApproach,
  type InsertSearchApproach,
  searchApproaches,
  type SearchSequence
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
          name: "Standard Search",
          prompt: "Execute comprehensive company and contact search with balanced validation",
          order: 1,
          active: true,
          moduleType: "company_overview",
          sequence: {
            modules: ['company_overview', 'decision_maker', 'email_discovery'],
            moduleConfigs: {
              company_overview: {
                subsearches: { 'company-validation': true },
                searchOptions: { ignoreFranchises: false }
              },
              decision_maker: {
                subsearches: { 'leadership-identification': true },
                searchOptions: { requireRole: true }
              },
              email_discovery: {
                subsearches: { 'pattern-discovery': true },
                searchOptions: { validatePatterns: true }
              }
            },
            validationStrategy: 'moderate'
          },
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              requiredFields: ["name"],
              minimumConfidence: 75
            }
          },
          validationRules: {}
        },
        {
          name: "High Precision Search",
          prompt: "Execute search with strict validation rules for highest accuracy",
          order: 2,
          active: true,
          moduleType: "company_overview",
          sequence: {
            modules: ['company_overview', 'decision_maker', 'email_discovery'],
            moduleConfigs: {
              company_overview: {
                subsearches: { 'deep-validation': true },
                searchOptions: { ignoreFranchises: true }
              },
              decision_maker: {
                subsearches: { 'strict-verification': true },
                searchOptions: { requireRole: true }
              },
              email_discovery: {
                subsearches: { 'pattern-verification': true },
                searchOptions: { validatePatterns: true }
              }
            },
            validationStrategy: 'strict'
          },
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              requiredFields: ["name", "role"],
              minimumConfidence: 90
            }
          },
          validationRules: {}
        },
        {
          name: "Quick Discovery",
          prompt: "Rapid search focusing on initial discovery with lenient validation",
          order: 3,
          active: true,
          moduleType: "company_overview",
          sequence: {
            modules: ['company_overview', 'decision_maker'],
            moduleConfigs: {
              company_overview: {
                subsearches: { 'basic-validation': true },
                searchOptions: { quickScan: true }
              },
              decision_maker: {
                subsearches: { 'quick-identification': true },
                searchOptions: { requireRole: false }
              }
            },
            validationStrategy: 'lenient'
          },
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              requiredFields: ["name"],
              minimumConfidence: 60
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