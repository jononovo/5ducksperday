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
          name: "Email Discovery",
          prompt: "Discover and validate email patterns and addresses for the company and its key contacts.",
          order: 3,
          active: true,
          moduleType: "email_discovery",
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              minimumConfidence: 50,
            },
          },
          technicalPrompt: "Find and validate company email patterns and contact addresses",
          responseStructure: "JSON with fields: emailPattern, validatedAddresses[]",
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
        },
        {
          name: "Market Position",
          prompt: "Analyze [COMPANY]'s market position, including market share, target audience, and competitive landscape.",
          order: 5,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Analyze market position and competitive landscape",
          responseStructure: "JSON with fields: marketShare, targetAudience, competitors[]",
        },
        {
          name: "Customer Base",
          prompt: "Identify and analyze [COMPANY]'s customer base, including demographics, sectors, and key accounts.",
          order: 6,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Analyze customer base and key accounts",
          responseStructure: "JSON with fields: demographics, sectors, keyAccounts[]",
        },
        {
          name: "Online Presence",
          prompt: "Evaluate [COMPANY]'s online presence across various platforms and digital channels.",
          order: 7,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Analyze digital presence and online engagement",
          responseStructure: "JSON with fields: platforms[], engagement, reach",
        },
        {
          name: "Services Analysis",
          prompt: "Detail analysis of [COMPANY]'s services, including core offerings, specializations, and service delivery model.",
          order: 8,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Analyze service offerings and delivery model",
          responseStructure: "JSON with fields: coreServices[], specializations[], deliveryModel",
        },
        {
          name: "Competitive Analysis",
          prompt: "Compare [COMPANY] with its competitors, focusing on strengths, weaknesses, and market differentiators.",
          order: 9,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Analyze competitive position and market differences",
          responseStructure: "JSON with fields: strengths[], weaknesses[], differentiators[]",
        },
        {
          name: "Differentiation Analysis",
          prompt: "Identify unique selling propositions and key differentiators that set [COMPANY] apart in their market.",
          order: 10,
          active: true,
          moduleType: "company_overview",
          config: {
            subsearches: {},
            searchOptions: {},
            searchSections: {},
            validationRules: {
              minimumConfidence: 0,
            },
          },
          technicalPrompt: "Analyze unique value propositions and market positioning",
          responseStructure: "JSON with fields: uniqueFeatures[], valueProposition, marketAdvantages[]",
        }
      ];

      for (const approach of defaultApproaches) {
        await this.createSearchApproach(approach);
      }
    }
  }
}