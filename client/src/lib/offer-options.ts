/**
 * Email Offer Strategy Options
 * Frontend definitions for email generation offer strategy selection
 */

export interface OfferOption {
  id: string;
  name: string;
  description: string;
}

export const OFFER_OPTIONS: OfferOption[] = [
  {
    id: 'none',
    name: 'None',
    description: 'No special offer strategy'
  },
  {
    id: 'hormozi',
    name: 'Hormozi',
    description: 'Benefit stacking that makes price negligible'
  },
  {
    id: 'oneOnOne',
    name: '1-on-1',
    description: '15 minutes personalized guidance and FREE setup'
  },
  {
    id: 'ifWeCant',
    name: 'If we can\'t',
    description: 'Guarantee-based with compelling backup offer'
  },
  {
    id: 'shinyFree',
    name: 'Shiny FREE',
    description: 'Free valuable resources like cheat sheets, API keys'
  },
  {
    id: 'caseStudy',
    name: 'Case Study',
    description: 'Social proof with specific company results'
  }
];

export const DEFAULT_OFFER = 'none';