/**
 * Email Offer Strategy Configurations
 * Defines different offer approaches for email generation
 */

export interface OfferConfig {
  id: string;
  name: string;
  description: string;
  subjectInstructions: string;
  framework?: string;              // Optional theory (for docs/tooltips, NOT sent to AI)
  actionableStructure: string;     // Specific format instructions sent to AI
  fallbackSuggestions?: string;    // Optional defaults when context is unclear
}

export const OFFER_CONFIGS: Record<string, OfferConfig> = {
  hormozi: {
    id: 'hormozi',
    name: 'Hormozi',
    description: 'Benefit stacking that makes price negligible',
    subjectInstructions: 'Create subject lines that focus on irresistible value stacks and outcomes',
    framework: 'Alex Hormozi\'s ethos centers on maximizing perceived value while minimizing perceived risk and effort. Formula: (Desirable Results + Trust) / (Time + Risk + Effort). The goal is to make saying no feel irrational.',
    actionableStructure: 'Structure as value stacking: "Instead of [current pain/inefficiency], get [3 specific stackable benefits] with [concrete guarantee] in [timeline]." Focus on overwhelming value vs cost.',
    fallbackSuggestions: 'When business context unclear, suggest: 30-50% efficiency improvement + cost reduction guarantee + risk-free 30-day trial period.'
  },
  oneOnOne: {
    id: 'oneOnOne',
    name: '1-on-1',
    description: '15 minutes personalized guidance and FREE setup',
    subjectInstructions: 'Emphasize personal, one-on-one attention and free setup value',
    actionableStructure: 'Offer personal consultation format: "15 minutes of personalized guidance + FREE [setup/audit/demo] tailored to [their specific situation]." Make it feel exclusive and high-touch.',
    fallbackSuggestions: 'When unclear about their needs, offer: free system audit + personalized recommendations + complimentary setup assistance.'
  },
  ifWeCant: {
    id: 'ifWeCant',
    name: 'If we can\'t',
    description: 'Guarantee-based with compelling backup offer',
    subjectInstructions: 'Lead with confidence and guarantee, create urgency',
    framework: 'Confidence-based selling that removes all perceived risk by offering compelling alternatives if primary promise fails.',
    actionableStructure: 'Structure as confidence guarantee: "You\'re probably [problem statement]. If we can\'t [deliver specific measurable result], we will immediately [compelling backup offer that\'s valuable but different]."',
    fallbackSuggestions: 'When specific metrics unclear, suggest: 15-20% improvement + money-back guarantee + valuable alternative like free consulting hours or premium resource access.'
  },
  shinyFree: {
    id: 'shinyFree',
    name: 'Shiny FREE',
    description: 'Free valuable resources like cheat sheets, API keys',
    subjectInstructions: 'Highlight the FREE valuable resource in subject line',
    actionableStructure: 'Lead with valuable free offer: "Can I send you a FREE [industry-specific valuable resource]?" Make the free item genuinely valuable and immediately useful.',
    fallbackSuggestions: 'When industry unclear, offer: comprehensive comparison guide + industry benchmarks + exclusive access to tools or data.'
  },
  caseStudy: {
    id: 'caseStudy',
    name: 'Case Study',
    description: 'Social proof with specific company results',
    subjectInstructions: 'Reference the case study company or impressive results in subject',
    framework: 'Leverage social proof and peer validation by showcasing specific, relatable success stories that create desire and trust.',
    actionableStructure: 'Structure with social proof: "We worked with [Company XYZ] and they achieved [specific result/quote]... what do you think about applying this to [their situation]?" Use credible, impressive outcomes.',
    fallbackSuggestions: 'When lacking specific case studies, create plausible industry examples: similar-sized company + relevant improvement metrics + applicable business benefit.'
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