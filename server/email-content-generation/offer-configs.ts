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
    framework: `# 1-on-1 Personal Guidance Strategy

The power of personal connection in cold outreach cannot be overstated. In a world of automated emails and generic pitches, offering genuine one-on-one time creates immediate differentiation and trust.

Core Psychology:
• Personal attention is rare and valuable - it makes recipients feel special and chosen
• Free consultation removes risk while demonstrating expertise
• Time-limited offers (15 minutes) feel manageable and respect their schedule
• "FREE setup" provides immediate tangible value beyond just conversation

Key Elements:
1. **Personalization at Scale**: Reference specific company challenges or industry trends
2. **Value-First Approach**: Lead with what you'll give them, not what you want
3. **Expert Positioning**: Position yourself as the person who personally handles this
4. **Clear Next Steps**: Make booking/responding effortless with specific call-to-action

Conversion Factors:
• People buy from people they trust
• Offering your personal time demonstrates confidence in your solution
• Free setup removes the "what's the catch" barrier
• Creates obligation reciprocity - they feel compelled to at least listen

Best Practices:
• Keep the time commitment specific and reasonable (15-20 minutes max)
• Emphasize "personalized" and "tailored" to their situation
• Include social proof or credentials to justify why your time is valuable
• Make scheduling frictionless with direct calendar links or simple reply instructions`,
    actionableStructure: 'Offer personal consultation format: "15 minutes of personalized guidance + FREE [setup/audit/demo] tailored to [their specific situation]." Make it feel exclusive and high-touch.',
    fallbackSuggestions: 'When unclear about their needs, offer: free system audit + personalized recommendations + complimentary setup assistance.'
  },
  ifWeCant: {
    id: 'ifWeCant',
    name: 'Guarantee',
    description: 'Guarantee-based with compelling backup offer',
    subjectInstructions: 'Lead with confidence and guarantee, create urgency',
    framework: `# "If We Can't" Guarantee Strategy

This confidence-based approach removes all perceived risk by making bold promises backed by compelling alternatives. It works by demonstrating absolute confidence in your solution while providing safety nets that are valuable in their own right.

Core Psychology:
• Guarantees remove the primary objection (risk/fear of failure)
• Backup offers that are valuable create "win-win" scenarios in prospect's mind
• Extreme confidence is contagious and builds trust
• Forces you to only make promises you can deliver on

Structure Components:
1. **Problem Acknowledgment**: "You're probably struggling with..."
2. **Bold Promise**: Specific, measurable outcome with timeline
3. **Risk Reversal**: "If we can't deliver X..."
4. **Valuable Alternative**: Backup offer worth significant value
5. **Time Pressure**: Creates urgency to act

Guarantee Types That Convert:
• Performance guarantees (specific results in timeframe)
• Money-back guarantees (removes financial risk)
• Time guarantees (results within X days or alternative)
• Outcome guarantees (achieve Y or receive Z)

Backup Offer Examples:
• Free consulting hours equal to project value
• Premium resource library access
• Competitor analysis and recommendations
• Industry connections and introductions
• Refund + bonus compensation for time invested

Success Factors:
• Backup offer must be genuinely valuable (not throwaway)
• Primary promise must be specific and measurable
• Timeline creates urgency and accountability
• You must be able to deliver on both primary and backup promises

Risk Management:
• Only guarantee what you can control or measure
• Build backup offers you can profitably deliver
• Set clear success metrics upfront
• Document everything for accountability

Psychological Triggers:
• Loss aversion (they can't lose)
• Social proof (confidence implies others succeeded)  
• Scarcity (time-limited guarantee)
• Authority (only experts make bold guarantees)`,
    actionableStructure: 'Structure as confidence guarantee: "You\'re probably [problem statement]. If we can\'t [deliver specific measurable result], we will immediately [compelling backup offer that\'s valuable but different]."',
    fallbackSuggestions: 'When specific metrics unclear, suggest: 15-20% improvement + money-back guarantee + valuable alternative like free consulting hours or premium resource access.'
  },
  shinyFree: {
    id: 'shinyFree',
    name: 'Shiny',
    description: 'Free valuable resources like cheat sheets, API keys',
    subjectInstructions: 'Highlight the FREE valuable resource in subject line',
    framework: `# Shiny FREE Resource Strategy

The "Shiny FREE" approach leverages the psychological power of valuable free resources to create immediate interest and demonstrate expertise. This strategy works because it provides instant gratification while showcasing your knowledge depth.

Psychology Behind FREE:
• "FREE" triggers immediate attention and reduces decision friction
• Valuable resources position you as an expert worth listening to  
• Creates reciprocity obligation - they feel compelled to engage after receiving value
• Demonstrates product/service quality through free samples of your expertise

Most Effective FREE Resources:
1. **Industry-Specific Tools**: Calculators, templates, checklists that solve immediate problems
2. **Exclusive Data**: Research reports, benchmarks, insider insights not publicly available
3. **Implementation Guides**: Step-by-step processes they can use immediately
4. **Access Resources**: Trial accounts, API keys, premium tool access
5. **Curated Lists**: Vetted vendor lists, tool comparisons, resource compilations

Success Factors:
• Resource must be genuinely valuable (worth $50+ if sold)
• Immediately usable without requiring your services
• Relevant to their specific industry/role challenges
• Easy to consume (not 50-page PDFs nobody reads)
• Positions your expertise naturally

Conversion Strategy:
• FREE resource gets them to engage
• Follow-up focuses on implementation questions
• Natural transition to "need help implementing this?"
• Already demonstrated value, so paid services feel like logical next step

Examples by Industry:
• SaaS: API integration templates, security checklists, scaling playbooks
• Marketing: Conversion templates, campaign frameworks, analytics dashboards  
• Finance: Compliance checklists, audit templates, calculation tools
• HR: Interview guides, onboarding templates, performance frameworks`,
    actionableStructure: 'Lead with valuable free offer: "Can I send you a FREE [industry-specific valuable resource]?" Make the free item genuinely valuable and immediately useful.',
    fallbackSuggestions: 'When industry unclear, offer: comprehensive comparison guide + industry benchmarks + exclusive access to tools or data.'
  },
  caseStudy: {
    id: 'caseStudy',
    name: 'Study',
    description: 'Social proof with specific company results',
    subjectInstructions: 'Reference the case study company or impressive results in subject',
    framework: `# Case Study Social Proof Strategy

Case studies leverage the powerful psychology of social proof and peer validation. People are more likely to believe in solutions when they see similar companies achieving real results. This strategy works because it provides concrete evidence rather than promises.

Psychology of Social Proof:
• People follow the actions of similar others (peer validation)
• Specific results are more believable than generic claims
• Success stories create desire and reduce risk perception
• "If it worked for them, it could work for me" mentality

Essential Case Study Elements:
1. **Company Similarity**: Similar size, industry, or challenges to prospect
2. **Specific Metrics**: Quantified results, not vague improvements
3. **Timeline Context**: How long it took to achieve results
4. **Challenge Parallel**: Problem that mirrors prospect's situation
5. **Outcome Details**: What success looked like in practice

Most Compelling Result Types:
• Revenue/profit increases (percentages and dollar amounts)
• Cost reductions and efficiency gains
• Time savings and process improvements
• Risk mitigation and compliance achievements
• Competitive advantages gained

Presentation Formats:
• "We worked with [Company] and they achieved [result]"
• "Similar to your situation, [Company] was struggling with [problem]..."
• "[Company] saw [specific improvement] after [timeframe]"
• "Here's what [Company] said about their results: [quote]"

Credibility Factors:
• Use real company names when possible (with permission)
• Include direct quotes from decision makers
• Share specific metrics and timelines
• Mention recognizable companies or industries
• Reference measurable, verifiable outcomes

Follow-up Strategy:
• "What do you think about applying this to [their situation]?"
• "Are you facing similar challenges to [Company]?"
• "Would you like to see how we could adapt this approach for [their company]?"
• "I'd love to explore if we could achieve similar results for you"

When You Lack Case Studies:
• Use industry benchmarks and typical improvements
• Reference similar-sized company examples
• Share aggregated results across clients
• Use hypothetical but realistic scenarios
• Focus on process and methodology proof`,
    actionableStructure: 'Structure with social proof: "We worked with [Company XYZ] and they achieved [specific result/quote]... what do you think about applying this to [their situation]?" Use credible, impressive outcomes.',
    fallbackSuggestions: 'When lacking specific case studies, create plausible industry examples: similar-sized company + relevant improvement metrics + applicable business benefit.'
  },
  coldEmailFormula: {
    id: 'coldEmailFormula',
    name: 'Formula',
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