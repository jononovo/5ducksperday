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
          name: "Company Overview",
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
          name: "Decision-maker Analysis",
          prompt: "Identify and analyze key decision-makers at [COMPANY], focusing on leadership roles and verification.",
          order: 2,
          active: true,
          moduleType: "decision_maker",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["name", "role"],
              scoreThresholds: {},
              minimumConfidence: 75
            }
          },
          validationRules: {},
          technicalPrompt: "Execute leadership identification and role verification",
          responseStructure: "JSON with fields: leaders[]{name, role, level, verificationScore}"
        },
        {
          name: "Email Discovery",
          prompt: "Discover and validate email patterns for [COMPANY] and its key contacts through multiple sources.",
          order: 3,
          active: true,
          moduleType: "email_discovery",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["pattern"],
              scoreThresholds: {},
              minimumConfidence: 80
            }
          },
          validationRules: {},
          technicalPrompt: "Execute email pattern discovery and initial validation",
          responseStructure: "JSON with fields: emailPattern, discoveredEmails[]{address, confidence}"
        },
        {
          name: "Enrich Email",
          prompt: "Enrich and validate discovered email addresses through comprehensive verification methods.",
          order: 4,
          active: true,
          moduleType: "email_enrichment",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["email"],
              scoreThresholds: {},
              minimumConfidence: 85
            }
          },
          validationRules: {},
          technicalPrompt: "Execute deep email validation and enrichment",
          responseStructure: "JSON with fields: enrichedEmails[]{email, validationScore, metadata}"
        },
        {
          name: "Email Deepdive",
          prompt: "Perform advanced analysis of contact information using both local and digital sources.",
          order: 5,
          active: true,
          moduleType: "email_deepdive",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false
            },
            searchSections: {},
            validationRules: {
              requiredFields: ["source"],
              scoreThresholds: {},
              minimumConfidence: 65
            }
          },
          validationRules: {},
          technicalPrompt: "Execute comprehensive source analysis and verification",
          responseStructure: "JSON with fields: deepFindings[]{source, contacts[], confidence}"
        }
      ];

      for (const approach of defaultApproaches) {
        await this.createSearchApproach(approach);
      }
    }
  }
}