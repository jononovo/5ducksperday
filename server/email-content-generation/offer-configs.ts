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
    framework: `Alex Hormozi's ethos around creating an "offer they can't resist" centers on maximizing perceived value while minimizing perceived risk and effort for the customer. The core idea is to make the offer so compelling that saying no feels irrational.

Summary of His Framework:
Hormozi often uses this formula:
(Desirable Results + Trust) / (Time + Risk + Effort) = Value

The goal is to increase the top half (desirable results and trust) and minimize the bottom half (time, difficulty, risk).

Succinct Examples:
• Business Coaching: Instead of "12-week coaching program," offer "We implement your client acquisition system for you and guarantee 10 high-ticket clients in 90 days—or you don't pay."
• Weight Loss Program: Rather than "access to fitness classes," offer "Lose 15lbs in 8 weeks, with a coach, meal plan, and refund guarantee."
• Marketing SaaS: Instead of "email automation tool," present "A done-for-you email system that books you 5–10 qualified appointments a month, or your subscription is free."

Core Principles Behind the Offers:
• Guarantees reduce risk.
• Done-for-you or speedy results reduce effort and time delay.
• Clear outcomes increase perceived value.
• Social proof or results claims raise trust.`,
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
  },
  coldEmailFormula: {
    id: 'coldEmailFormula',
    name: 'Cold Email Formula',
    description: '5-part proven framework with 37% open rate',
    subjectInstructions: 'Use simple, close-to-home format: "COMPANY" + "SERVICE" approach',
    framework: `# Cold Email Formula 

The 5 part cold email
With a 37% open rate and 7% reply rate.

Took 2-3 months and 5–6+ tests to get here. 
It's not perfect (it never is). 
But it's a game of inches.

1. Subject – ask yourself what resonates with your customers.
The simplest, closest-to-home stuff often works. 
Pull them in but don't pull a fast one on them.

e.g. "COMPANY" + "SERVICE"

2. Opening – personalize at scale with a question that ties to your service. 
Personalization doesn't need to be this massive research project.
Find a common pattern that speaks to each customer uniquely.

e.g. "PERSONAL" + "SERVICE QUESTION"

3. Pain – make them feel the pain.
Paint the picture of their day-to-day frustration. 
Keep it short, but don't be afraid to dig into it.
More pain, more gain ;)

e.g. "PAIN" + "OTHER RESPONSIBILITIES"

4. Solution – If you're the founder sending the email.
Lead with being with the founder (shoutout Alana Branston for the push here)
Drop a clear glimpse of what your product actually does (not just "it's a CRM"). 
Bonus points if you can tie with results (1 stat is fine).

e.g. "FOUNDER" + "YOUR COMPANY". "SERVICE" + "CLIENTS" + "RESULTS" 

5. Question – end with a question, but not a yes/no. 
Push it with an A or B choice (shoutout Zayd Syed Ali for this tip).

e.g. "Want me to send over A or B?"

BONUS: Break the mold - GIFs or diagrams can sometimes trigger spam filters. But if you're sending hyper-targeted batches, a little visual goes a long way.`,
    actionableStructure: 'Follow 5-part structure: 1) Subject: [Company + Service], 2) Opening: [Personal question tied to service], 3) Pain: [Day-to-day frustration picture], 4) Solution: [Founder + company + clear service description + results], 5) Question: [A or B choice, not yes/no]',
    fallbackSuggestions: 'When context unclear: use industry pain points + founder introduction + service efficiency stats + choice between demo/consultation options.'
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