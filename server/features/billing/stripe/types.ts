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