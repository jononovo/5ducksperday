import { UserCredits, CreditTransaction, SearchType, CreditDeductionResult, CREDIT_COSTS, MONTHLY_CREDIT_ALLOWANCE, STRIPE_CONFIG } from "./types";
import { storage } from '../../../storage';

/**
 * Error thrown when user has insufficient credits for an action
 */
export class InsufficientCreditsError extends Error {
  constructor(
    public balance: number,
    public required: number,
    public actionType: SearchType
  ) {
    super(`Insufficient credits: have ${balance}, need ${required} for ${actionType}`);
    this.name = 'InsufficientCreditsError';
  }
}

/**
 * Options for the withCreditBilling wrapper
 */
export interface CreditBillingOptions {
  /** Skip deduction (for cron/system jobs that don't bill) */
  skipDeduction?: boolean;
  /** Additional metadata for transaction logging */
  metadata?: Record<string, any>;
}

export class CreditService {
  /**
   * Get user credits
   * Credits are now awarded at registration time via CreditRewardService.awardOneTimeCredits()
   * This function simply retrieves the current state - no lazy initialization
   */
  static async getUserCredits(userId: number): Promise<UserCredits> {
    try {
      console.log(`[CreditService] Getting credits for user ${userId}`);
      
      // Get credits from PostgreSQL
      const creditData = await storage.getUserCredits(userId);
      
      if (!creditData) {
        // No credits found - this shouldn't happen for registered users
        // Return zero balance (credits are awarded at registration, not lazily)
        console.log(`[CreditService] No credits found for user ${userId} - returning zero balance`);
        return {
          currentBalance: 0,
          lastTopUp: Date.now(),
          totalUsed: 0,
          isBlocked: false,
          transactions: [],
          monthlyAllowance: MONTHLY_CREDIT_ALLOWANCE,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
      }
      
      // Get transaction history
      const transactions = await storage.getUserCreditHistory(userId);
      
      // Get subscription data for Stripe customer ID and plan info
      const subscriptionData = await storage.getUserSubscription(userId);
      
      // Convert to UserCredits format
      const userCredits: UserCredits = {
        currentBalance: creditData.balance,
        lastTopUp: creditData.lastUpdated?.getTime() || Date.now(),
        totalUsed: creditData.totalUsed,
        isBlocked: creditData.balance < 0,
        transactions: transactions.map((tx: any) => ({
          type: tx.type === 'usage' ? 'debit' : 'credit',
          amount: Math.abs(tx.amount),
          description: tx.description || '',
          timestamp: tx.createdAt?.getTime() || Date.now(),
          searchType: tx.metadata?.searchType,
          success: tx.metadata?.success
        })),
        monthlyAllowance: MONTHLY_CREDIT_ALLOWANCE,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Include subscription data from subscriptions table
        stripeCustomerId: subscriptionData?.stripeCustomerId,
        stripeSubscriptionId: subscriptionData?.stripeSubscriptionId,
        subscriptionStatus: subscriptionData?.status as UserCredits['subscriptionStatus'],
        currentPlan: subscriptionData?.planType as UserCredits['currentPlan'],
        subscriptionStartDate: subscriptionData?.currentPeriodStart?.getTime(),
        subscriptionEndDate: subscriptionData?.currentPeriodEnd?.getTime(),
        easterEggs: [],
        badges: []
      };
      
      console.log(`[CreditService] Loaded credits for user ${userId}: balance=${userCredits.currentBalance}`);
      return userCredits;
    } catch (error) {
      console.error(`Error getting credits for user ${userId}:`, error);
      // Return zero balance on error - credits are awarded at registration, not here
      return {
        currentBalance: 0,
        lastTopUp: Date.now(),
        totalUsed: 0,
        isBlocked: false,
        transactions: [],
        monthlyAllowance: MONTHLY_CREDIT_ALLOWANCE,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
  }

  /**
   * Unified credit billing wrapper
   * 
   * Use this for ALL billable actions to ensure consistent credit handling:
   * 1. Pre-check: Verify user has sufficient credits BEFORE starting
   * 2. Execute: Run the billable action
   * 3. Deduct: Bill credits only on success
   * 
   * @param userId - The user ID to bill
   * @param actionType - The type of action (from CREDIT_COSTS)
   * @param action - The async function to execute if credits are sufficient
   * @param options - Optional settings (skipDeduction for cron jobs, metadata for logging)
   * @returns The result of the action
   * @throws InsufficientCreditsError if user doesn't have enough credits
   * 
   * @example
   * // Standard usage
   * const result = await CreditService.withCreditBilling(
   *   userId,
   *   'company_search',
   *   async () => {
   *     return await performExpensiveSearch();
   *   }
   * );
   * 
   * @example
   * // Cron job (no billing)
   * await CreditService.withCreditBilling(
   *   userId,
   *   'company_search',
   *   async () => await performSearch(),
   *   { skipDeduction: true }
   * );
   */
  static async withCreditBilling<T>(
    userId: number,
    actionType: SearchType,
    action: () => Promise<T>,
    options?: CreditBillingOptions
  ): Promise<T> {
    // 1. Pre-check: Verify user has sufficient credits
    const credits = await this.getUserCredits(userId);
    const cost = CREDIT_COSTS[actionType];
    
    if (credits.currentBalance < cost) {
      console.log(`[CreditService] Insufficient credits for user ${userId}: has ${credits.currentBalance}, needs ${cost} for ${actionType}`);
      throw new InsufficientCreditsError(credits.currentBalance, cost, actionType);
    }
    
    console.log(`[CreditService] Pre-check passed for user ${userId}: ${actionType} (cost: ${cost}, balance: ${credits.currentBalance})`);
    
    // 2. Execute: Run the billable action
    const result = await action();
    
    // 3. Deduct: Bill credits only on success (unless skipped)
    if (!options?.skipDeduction) {
      await this.deductCredits(userId, actionType, true);
      console.log(`[CreditService] Billed ${cost} credits to user ${userId} for ${actionType}`);
    } else {
      console.log(`[CreditService] Skipped billing for user ${userId} (skipDeduction=true)`);
    }
    
    return result;
  }

  /**
   * Check if user needs monthly top-up and apply if needed
   */
  static async checkAndApplyMonthlyTopUp(userId: number): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    const now = new Date();
    const lastTopUp = new Date(credits.lastTopUp);
    
    // Check if it's a new month
    const isNewMonth = now.getMonth() !== lastTopUp.getMonth() || 
                      now.getFullYear() !== lastTopUp.getFullYear();
    
    if (isNewMonth) {
      // Get subscription status from PostgreSQL
      const subscription = await storage.getUserSubscription(userId);
      const isSubscribed = subscription?.status === 'active' && subscription?.planType;
      
      const creditAmount = isSubscribed && subscription.planType
        ? STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES[subscription.planType as keyof typeof STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES] || MONTHLY_CREDIT_ALLOWANCE
        : MONTHLY_CREDIT_ALLOWANCE;

      const getPlanDescription = () => {
        if (!isSubscribed || !subscription?.planType) return 'free tier';
        switch (subscription.planType) {
          case 'ugly-duckling': return 'The Duckling subscription (2,000 base + 3,000 bonus)';
          case 'duckin-awesome': return 'Mama Duck subscription (5,000 base + 10,000 bonus)';
          default: return `${subscription.planType} subscription`;
        }
      };
      const planDescription = getPlanDescription();
      
      const description = `Monthly top-up for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (${planDescription})`;
      
      // Apply monthly top-up using PostgreSQL
      await storage.updateUserCredits(userId, creditAmount, 'bonus', description);
      
      console.log(`Applied monthly top-up for user ${userId}: +${creditAmount} credits (${planDescription})`);
      return true;
    }
    
    return false;
  }

  /**
   * Deduct credits for a successful search
   */
  static async deductCredits(
    userId: number, 
    searchType: SearchType, 
    success: boolean = true,
    customAmount?: number
  ): Promise<CreditDeductionResult> {
    // Check for monthly top-up first
    await this.checkAndApplyMonthlyTopUp(userId);
    
    const credits = await this.getUserCredits(userId);
    const amount = customAmount || CREDIT_COSTS[searchType];
    
    // Only deduct if search was successful
    if (!success) {
      return {
        success: true,
        newBalance: credits.currentBalance,
        isBlocked: credits.isBlocked
      };
    }

    try {
      const description = `${searchType.replace('_', ' ')} search`;
      
      // Deduct credits using PostgreSQL (negative amount for deduction)
      const result = await storage.updateUserCredits(userId, -amount, 'usage', description);
      
      const newBalance = result.balance;
      const isBlocked = newBalance < 0;

      console.log(`Credits deducted for user ${userId}: -${amount} credits for ${searchType} (success: ${success})`);
      console.log(`New balance: ${newBalance}, Blocked: ${isBlocked}`);

      return {
        success: true,
        newBalance,
        isBlocked,
        transaction: {
          type: 'debit',
          amount,
          description,
          timestamp: Date.now(),
          searchType,
          success
        }
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient credits') {
        const isBlocked = true;
        return {
          success: false,
          newBalance: credits.currentBalance,
          isBlocked,
          transaction: {
            type: 'debit',
            amount,
            description: `Failed: ${searchType.replace('_', ' ')} search - insufficient credits`,
            timestamp: Date.now(),
            searchType,
            success: false
          }
        };
      }
      throw error;
    }
  }

  /**
   * Check if user is blocked
   */
  static async isUserBlocked(userId: number): Promise<boolean> {
    const credits = await this.getUserCredits(userId);
    return credits.isBlocked;
  }

  /**
   * Get credit balance
   */
  static async getCreditBalance(userId: number): Promise<number> {
    const creditData = await storage.getUserCredits(userId);
    return creditData?.balance || 0;
  }

  /**
   * Get credit transaction history
   */
  static async getCreditHistory(userId: number, limit: number = 50): Promise<CreditTransaction[]> {
    const transactions = await storage.getUserCreditHistory(userId, limit);
    
    return transactions.map((tx: any) => ({
      type: tx.type === 'usage' ? 'debit' : 'credit',
      amount: Math.abs(tx.amount),
      description: tx.description || '',
      timestamp: tx.createdAt?.getTime() || Date.now(),
      searchType: tx.metadata?.searchType,
      success: tx.metadata?.success
    }));
  }

  /**
   * Update user subscription status
   */
  static async updateUserSubscription(
    userId: number,
    status: 'active' | 'cancelled' | 'expired' | 'pending',
    planId?: string,
    metadata?: any
  ): Promise<void> {
    await storage.updateUserSubscription(userId, {
      status,
      planId,
      startedAt: new Date(),
      metadata: metadata || {}
    });
    
    console.log(`[CreditService] Updated subscription for user ${userId}: status=${status}, plan=${planId}`);
  }

  /**
   * Add credits to user account (for purchases, refunds, bonuses)
   */
  static async addCredits(userId: number, amount: number, description: string): Promise<{ 
    success: boolean; 
    newBalance: number 
  }> {
    try {
      const result = await storage.updateUserCredits(userId, amount, 'purchase', description);
      
      console.log(`[CreditService] Added ${amount} credits to user ${userId}: ${description}`);
      
      return {
        success: true,
        newBalance: result.balance
      };
    } catch (error) {
      console.error(`[CreditService] Failed to add credits for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Refund credits for failed operations
   */
  static async refundCredits(userId: number, amount: number, reason: string): Promise<{ 
    success: boolean; 
    newBalance: number 
  }> {
    try {
      const result = await storage.updateUserCredits(userId, amount, 'refund', reason);
      
      console.log(`[CreditService] Refunded ${amount} credits to user ${userId}: ${reason}`);
      
      return {
        success: true,
        newBalance: result.balance
      };
    } catch (error) {
      console.error(`[CreditService] Failed to refund credits for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Process subscription payment and add credits
   */
  static async processSubscriptionPayment(
    userId: number,
    planId: string,
    paymentAmount: number,
    stripePaymentId: string
  ): Promise<void> {
    const creditAmount = STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES[planId as keyof typeof STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES] || 0;
    
    if (creditAmount > 0) {
      const planName = planId === 'ugly-duckling' 
        ? 'The Duckling' 
        : planId === 'duckin-awesome' 
          ? 'Mama Duck' 
          : planId;
      
      const description = `Subscription payment - ${planName} plan (${stripePaymentId})`;
      
      await storage.updateUserCredits(userId, creditAmount, 'purchase', description);
      
      console.log(`[CreditService] Processed subscription payment for user ${userId}: ${planName} (+${creditAmount} credits)`);
    }
  }

  /**
   * Get user's subscription status
   */
  static async getUserSubscription(userId: number): Promise<any> {
    return await storage.getUserSubscription(userId);
  }

  /**
   * Update Stripe customer ID for a user
   * Used when creating a new Stripe customer during checkout
   */
  static async updateStripeCustomerId(userId: number, stripeCustomerId: string): Promise<void> {
    await storage.updateUserSubscription(userId, {
      stripeCustomerId
    });
    
    console.log(`[CreditService] Updated Stripe customer ID for user ${userId}: ${stripeCustomerId}`);
  }

  /**
   * Update subscription details from Stripe webhook
   * Accepts object format expected by Stripe routes
   */
  static async updateSubscription(userId: number, data: {
    stripeSubscriptionId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
    currentPlan?: string;
    subscriptionStartDate?: number;
    subscriptionEndDate?: number;
  }): Promise<void> {
    const updateData: any = {};
    
    if (data.stripeSubscriptionId) {
      updateData.stripeSubscriptionId = data.stripeSubscriptionId;
    }
    if (data.subscriptionStatus) {
      updateData.status = data.subscriptionStatus;
    }
    if (data.currentPlan !== undefined) {
      updateData.planType = data.currentPlan;
    }
    if (data.subscriptionStartDate) {
      updateData.currentPeriodStart = new Date(data.subscriptionStartDate);
    }
    if (data.subscriptionEndDate) {
      updateData.currentPeriodEnd = new Date(data.subscriptionEndDate);
    }
    
    await storage.updateUserSubscription(userId, updateData);
    
    console.log(`[CreditService] Updated subscription for user ${userId}:`, data);
  }

  /**
   * Award subscription credits when subscription becomes active
   */
  static async awardSubscriptionCredits(userId: number, planId: 'ugly-duckling' | 'duckin-awesome'): Promise<void> {
    const creditAmount = STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES[planId] || 0;
    
    if (creditAmount > 0) {
      const planName = planId === 'ugly-duckling' 
        ? 'The Duckling' 
        : planId === 'duckin-awesome' 
          ? 'Mama Duck' 
          : planId;
      
      const description = `Subscription activated - ${planName} plan (+${creditAmount} credits)`;
      
      await storage.updateUserCredits(userId, creditAmount, 'bonus', description);
      
      console.log(`[CreditService] Awarded ${creditAmount} subscription credits to user ${userId} for ${planName} plan`);
    }
  }
}