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
          prompt: "Provide a detailed overview of [COMPANY], including its age, size, and main business focus.",
          order: 1,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false,
            },
            searchSections: {},
            validationRules: {
              requiredFields: [],
              scoreThresholds: {},
              minimumConfidence: 0,
            },
          },
          validationRules: {},
          technicalPrompt: "Analyze company details focusing on age, size, and core business activities.",
          responseStructure: "JSON with fields: age, size, mainFocus",
        },
        {
          name: "Decision-maker Analysis",
          prompt: "Identify and analyze the key decision-makers at [COMPANY]. Focus on C-level executives, owners, founders, and other top-level decision-makers.",
          order: 2,
          active: true,
          moduleType: "decision_maker",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false,
            },
            searchSections: {},
            validationRules: {
              requiredFields: [],
              scoreThresholds: {},
              minimumConfidence: 0,
            },
          },
          validationRules: {},
          technicalPrompt: "Identify key decision-makers at [COMPANY], including roles and contact information.",
          responseStructure: "JSON with fields: decisionMakers",
        },
        {
          name: "Email Discovery",
          prompt: "Discover and validate email patterns and addresses for the company and its key contacts.",
          order: 3,
          active: true,
          moduleType: "email_discovery",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false,
            },
            searchSections: {},
            validationRules: {
              requiredFields: [],
              scoreThresholds: {},
              minimumConfidence: 50,
            },
          },
          validationRules: {},
          technicalPrompt: "Find and validate company email patterns and contact addresses",
          responseStructure: "JSON with fields: emailPattern, validatedAddresses[]",
        },
        {
          name: "Enrich Email",
          prompt: "Enrich and validate discovered email addresses through multiple verification methods.",
          order: 4,
          active: true,
          moduleType: "contact_enrichment",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false,
            },
            searchSections: {},
            validationRules: {
              requiredFields: [],
              scoreThresholds: {},
              minimumConfidence: 70,
            },
          },
          validationRules: {},
          technicalPrompt: "Enrich and verify email addresses using multiple validation methods",
          responseStructure: "JSON with fields: enrichedEmails[], verificationMethods[]",
        },
        {
          name: "Email Deepdive",
          prompt: "Perform an in-depth analysis of contact information using both local and digital sources.",
          order: 5,
          active: true,
          moduleType: "contact_deepdive",
          config: {
            subsearches: {},
            searchOptions: {
              ignoreFranchises: false,
              locallyHeadquartered: false,
            },
            searchSections: {
              local_sources: {
                id: "local_sources",
                label: "Local Sources",
                description: "Search local sources for company and contact information",
                searches: [
                  {
                    id: "local-business-associations",
                    label: "Business Associations",
                    description: "Search local business associations",
                    implementation: "Search business associations for [COMPANY]",
                  },
                ],
              },
              digital_sources: {
                id: "digital_sources",
                label: "Digital Sources",
                description: "Search digital platforms for contact information",
                searches: [
                  {
                    id: "email-pattern-analysis",
                    label: "Email Pattern Analysis",
                    description: "Analyze email patterns across platforms",
                    implementation: "Analyze email patterns for [COMPANY]",
                  },
                ],
              },
            },
            validationRules: {
              requiredFields: [],
              scoreThresholds: {},
              minimumConfidence: 60,
            },
          },
          validationRules: {},
          technicalPrompt: "Execute deep search strategies across local and digital sources",
          responseStructure: "JSON with fields: contacts[]{name, role, email, source}",
        },
      ];

      for (const approach of defaultApproaches) {
        await this.createSearchApproach(approach);
      }
    }
  }
}