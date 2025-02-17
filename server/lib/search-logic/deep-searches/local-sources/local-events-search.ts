import type { SearchImplementation, SearchContext, SearchResult } from '../../shared/types';
import { normalizeConfidenceScore } from '../../shared/utils';

export const localEventsSearch: SearchImplementation = {
  name: "Local Events Search",
  description: "Search local business events, conferences, and speaking engagements for contact discovery",

  async execute(context: SearchContext): Promise<SearchResult[]> {
    const { companyName, topProspects = [] } = context;

    return [{
      content: `Searching ${companyName} participation in local events and conferences`,
      confidence: normalizeConfidenceScore(0.85),
      source: "local_events",
      metadata: {
        searchDate: new Date().toISOString(),
        searchType: "event_participation",
        aiPrompt: `Find business contacts and email addresses for ${companyName} through:
          1. Recent local business events where company representatives spoke or participated
          2. Industry conferences and trade shows in the area
          3. Chamber of commerce events and networking sessions
          4. Local business award ceremonies and recognition events
          5. Professional development and training sessions

          For each event, identify:
          - Event name and date
          - Company representatives who attended
          - Their roles and presentations
          - Networking opportunities and connections made`,
        eventTypes: [
          "business_conferences",
          "industry_seminars",
          "networking_events",
          "award_ceremonies",
          "speaking_engagements",
          "trade_shows",
          "professional_workshops"
        ],
        searchParameters: {
          timeframe: "last_12_months",
          radius: "50_miles",
          eventSize: "all",
          industryFocus: true,
          requireCompanyParticipation: true
        },
        prospectTargeting: {
          onlyTopProspects: true,
          prospects: topProspects.map(p => ({
            name: p.name,
            role: p.role,
            score: p.score
          })),
          requireVerification: true,
          minConfidence: 0.7
        }
      }
    }];
  }
};

export default localEventsSearch;