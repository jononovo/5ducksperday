export interface StripeCustomerData {
  customerId: string;
  email: string;
  userId: number;
}

export interface CheckoutSessionData {
  checkoutUrl: string | null;
  sessionId: string;
}

export interface SubscriptionStatus {
  hasSubscription: boolean;
  status: string | null;
  currentPlan: string | null;
  subscriptionId?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

// Stripe configuration with environment-based price selection
export const STRIPE_CONFIG = {
  // Use environment variable for product ID, fallback to provided production product
  get UGLY_DUCKLING_PRODUCT_ID() {
    return process.env.STRIPE_PRODUCT_ID || 'prod_SXlmpPTIOgmmjo';
  },
  // Use environment variable for price ID, fallback to provided production price
  get UGLY_DUCKLING_PRICE_ID() {
    return process.env.STRIPE_PRICE_ID || 'price_1RcgF4K7jbIybp9HaHIZlv2W';
  },
  PLAN_CREDIT_ALLOWANCES: {
    'ugly-duckling': 5000, // 2000 base + 3000 bonus
    'duckin-awesome': 15000, // 5000 base + 10000 bonus
    'free': 250 // Default free credits
  }
} as const;