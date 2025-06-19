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

export enum SearchType {
  COMPANY_SEARCH = 'company_search',
  CONTACT_SEARCH = 'contact_search', 
  EMAIL_SEARCH = 'email_search',
  FULL_SEARCH = 'full_search',
  INDIVIDUAL_EMAIL = 'individual_email'
}

export const CREDIT_COSTS = {
  [SearchType.COMPANY_SEARCH]: 10,
  [SearchType.CONTACT_SEARCH]: 60,
  [SearchType.EMAIL_SEARCH]: 170,
  [SearchType.FULL_SEARCH]: 250,
  [SearchType.INDIVIDUAL_EMAIL]: 20
} as const;

export const MONTHLY_CREDIT_ALLOWANCE = 5000;