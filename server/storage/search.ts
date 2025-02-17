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
          technicalPrompt: "Analyze company details focusing on age, size, and core business activities.",
          responseStructure: "JSON with fields: age, size, mainFocus",
        },
        {
          name: "Decision-maker Analysis",
          prompt: "Identify and analyze the key decision-makers at [COMPANY]. Focus on C-level executives, owners, founders, and other top-level decision-makers. Include their roles and any available contact information.",
          order: 2,
          active: true,
          moduleType: "decision_maker",
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
                    id: "local-news-search",
                    label: "Local News Search",
                    description: "Search local news sources for company leadership mentions and activities",
                    implementation: "Search local news for [COMPANY] leadership mentions",
                  },
                  {
                    id: "business-associations-search",
                    label: "Business Associations Search",
                    description: "Search local chambers of commerce and business association memberships",
                    implementation: "Search business associations for [COMPANY] memberships",
                  },
                ],
              },
            },
            validationRules: {
              requiredFields: [],
              scoreThresholds: {},
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Identify key decision-makers at [COMPANY], including roles and contact information.",
          responseStructure: "JSON with fields: decisionMakers",
        },
        {
          name: "Email Deepdive",
          prompt: "Perform an in-depth analysis of contact information using both local and digital sources to discover additional decision makers and their contact details.",
          order: 4,
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
                subsectionRef: "EMAIL_DEEPDIVE_SECTIONS.local_sources",
                searches: []
              },
              digital_sources: {
                id: "digital_sources",
                label: "Digital Sources",
                description: "Search digital platforms for company presence",
                subsectionRef: "EMAIL_DEEPDIVE_SECTIONS.digital_sources",
                searches: []
              }
            },
            validationRules: {
              requiredFields: [],
              scoreThresholds: {},
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Execute deep search strategies across local and digital sources to identify and verify contact information.",
          responseStructure: "JSON with fields: contacts[]{name, role, email, source}",
        }
      ];

      for (const approach of defaultApproaches) {
        await this.createSearchApproach(approach);
      }
    }
  }
}