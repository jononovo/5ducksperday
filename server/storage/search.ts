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
          name: "Standard Search",
          prompt: "Analyze and provide comprehensive details about [COMPANY], including size, industry focus, and business validation.",
          order: 1,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["name", "industry"],
              scoreThresholds: {},
              minimumConfidence: 70
            }
          },
          validationRules: {},
          technicalPrompt: "Execute company profile analysis and business validation checks",
          responseStructure: "JSON with fields: companyProfile{size, age, industry, focus, validationScore}"
        },
        {
          name: "Strict Validation",
          prompt: "Identify and analyze key decision-makers with strict name validation.",
          order: 2,
          active: true,
          moduleType: "decision_maker",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: true,
              locallyHeadquartered: true
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["name", "role"],
              scoreThresholds: {
                nameConfidence: 80,
                roleConfidence: 75
              },
              minimumConfidence: 85
            }
          },
          validationRules: {
            minimumScore: 85,
            requireRole: true,
            roleMinimumScore: 75
          },
          technicalPrompt: "Execute strict leadership identification with enhanced validation",
          responseStructure: "JSON with fields: leaders[]{name, role, level, verificationScore}"
        },
        {
          name: "Local Business Focus",
          prompt: "Focus on local business sources and directories for contact discovery.",
          order: 3,
          active: true,
          moduleType: "local_sources",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: true,
              locallyHeadquartered: true
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["name", "source"],
              scoreThresholds: {
                nameConfidence: 75,
                sourceConfidence: 70
              },
              minimumConfidence: 75
            }
          },
          validationRules: {},
          technicalPrompt: "Execute local business search with verification",
          responseStructure: "JSON with fields: localSources[]{source, contacts[], confidence}"
        }
      ];

      for (const approach of defaultApproaches) {
        await this.createSearchApproach(approach);
      }
    }
  }
}