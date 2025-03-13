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
          name: "Small Business Decision-Makers",
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
                subsearches: { 'direct-contact-discovery': true },
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
              requiredFields: ["name", "role"],
              scoreThresholds: { roleConfidence: 75 },
              minimumConfidence: 75
            }
          },
          validationRules: {}
        },
        {
          name: "Contractor Search",
          prompt: "Find independent contractors and freelance professionals",
          order: 1,
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
          order: 2,
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
          order: 3,
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
          order: 4,
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