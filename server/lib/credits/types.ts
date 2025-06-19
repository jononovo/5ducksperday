export interface CreditTransaction {
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  timestamp: number;
  searchType?: string;
  success?: boolean;
}

export interface EasterEgg {
  id: number;
  trigger: string;
  reward: number;
  description: string;
  emoji?: string;
}

export interface UserCredits {
  currentBalance: number;
  lastTopUp: number;
  totalUsed: number;
  isBlocked: boolean;
  transactions: CreditTransaction[];
  monthlyAllowance: number;
  createdAt: number;
  updatedAt: number;
  easterEggs?: number[];  // [0, 1, 1] tracking array
}

export interface CreditDeductionResult {
  success: boolean;
  newBalance: number;
  isBlocked: boolean;
  transaction?: CreditTransaction;
  error?: string;
}

export type SearchType = 
  | 'company_search'
  | 'contact_discovery'
  | 'email_search'
  | 'full_search'
  | 'company_and_contacts'
  | 'company_contacts_emails'
  | 'individual_email';

export const CREDIT_COSTS: Record<SearchType, number> = {
  'company_search': 10,
  'contact_discovery': 60,
  'email_search': 170,
  'full_search': 250,
  'company_and_contacts': 70,   // 10 + 60
  'company_contacts_emails': 240, // 10 + 60 + 170
  'individual_email': 20
} as const;

export const MONTHLY_CREDIT_ALLOWANCE = 5000;

export const EASTER_EGGS: EasterEgg[] = [
  { 
    id: 0, 
    trigger: "5ducks", 
    reward: 1000, 
    description: "Easter egg bonus - 5ducks discovered!", 
    emoji: "🥚" 
  }
  // Future eggs easily added here
];