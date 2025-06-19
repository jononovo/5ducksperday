export interface CreditTransaction {
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  timestamp: number;
  searchType?: string;
  success?: boolean;
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
  | 'individual_email';

export const CREDIT_COSTS: Record<SearchType, number> = {
  'company_search': 10,
  'contact_discovery': 60,
  'email_search': 170,
  'full_search': 250,
  'individual_email': 20
} as const;

export const MONTHLY_CREDIT_ALLOWANCE = 5000;