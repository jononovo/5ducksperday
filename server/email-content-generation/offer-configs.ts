/**
 * Email Offer Strategy Configurations
 * Defines different offer approaches for email generation
 */

export interface OfferConfig {
  id: string;
  name: string;
  description: string;
  subjectInstructions: string;
  bodyInstructions: string;
}

export const OFFER_CONFIGS: Record<string, OfferConfig> = {
  hormozi: {
    id: 'hormozi',
    name: 'Hormozi',
    description: 'Benefit stacking that makes price negligible',
    subjectInstructions: 'Create subject lines that focus on irresistible value stacks and outcomes',
    bodyInstructions: 'Use Alex Hormozi\'s approach: Stack multiple high-value benefits, bonuses, and guarantees to make the price seem negligible compared to the total value offered. Focus on what they get, not what they pay.'
  },
  oneOnOne: {
    id: 'oneOnOne',
    name: '1-on-1',
    description: '15 minutes personalized guidance and FREE setup',
    subjectInstructions: 'Emphasize personal, one-on-one attention and free setup value',
    bodyInstructions: 'Offer 15 minutes of personalized guidance plus a FREE setup of the system, test drive, or demo. Make it feel exclusive and tailored to their specific needs.'
  },
  ifWeCant: {
    id: 'ifWeCant',
    name: 'If we can\'t',
    description: 'Guarantee-based with compelling backup offer',
    subjectInstructions: 'Lead with confidence and guarantee, create urgency',
    bodyInstructions: 'Structure as "You\'re probably [problem statement]. If we can\'t [deliver specific result like "shave off at least 15% of your current bill"], we will immediately offer you [compelling backup like "2 free tickets to the latest Broadway show"]."'
  },
  shinyFree: {
    id: 'shinyFree',
    name: 'Shiny FREE',
    description: 'Free valuable resources like cheat sheets, API keys',
    subjectInstructions: 'Highlight the FREE valuable resource in subject line',
    bodyInstructions: 'Lead with "Can I send you a FREE [valuable resource]?" Options include: industry index, comparison chart, cheat sheet, API key, exclusive list, or insider guide. Make the free item genuinely valuable and relevant.'
  },
  caseStudy: {
    id: 'caseStudy',
    name: 'Case Study',
    description: 'Social proof with specific company results',
    subjectInstructions: 'Reference the case study company or impressive results in subject',
    bodyInstructions: 'Lead with "We worked with [Company XYZ] and they said: [specific quote or result]... what do you think about this?" Use real, impressive outcomes and let social proof do the selling.'
  }
};

export function getOfferConfig(offerId: string): OfferConfig | null {
  if (!offerId || offerId === 'none') {
    return null;
  }
  
  const config = OFFER_CONFIGS[offerId];
  if (!config) {
    console.warn(`Unknown offer strategy ID: ${offerId}, skipping offer instructions`);
    return null;
  }
  
  return config;
}

// Export for frontend consumption
export const OFFER_OPTIONS = Object.values(OFFER_CONFIGS).map(config => ({
  id: config.id,
  name: config.name,
  description: config.description
}));