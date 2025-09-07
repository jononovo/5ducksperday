import { UserCredits, CreditTransaction, SearchType, CreditDeductionResult, CREDIT_COSTS, MONTHLY_CREDIT_ALLOWANCE, EasterEgg, EASTER_EGGS, NotificationConfig, NOTIFICATIONS, BadgeConfig, BADGES, STRIPE_CONFIG } from "./types";
import { GamificationService } from '../gamification/service';
import Database from '@replit/database';

// Replit DB instance for persistent credit storage
const db = new Database();

export class CreditService {
  private static readonly CREDIT_KEY_PREFIX = "user_credits:";

  private static getCreditKey(userId: number): string {
    return `${this.CREDIT_KEY_PREFIX}${userId}`;
  }

  /**
   * Get user credits, creating initial record if needed
   */
  static async getUserCredits(userId: number): Promise<UserCredits> {
    const key = this.getCreditKey(userId);
    
    try {
      console.log(`[CreditService] Getting credits for user ${userId}`);
      const creditsData = await db.get(key);
      
      let credits: UserCredits | undefined;
      
      if (creditsData && creditsData.ok !== false) {
        try {
          // Extract value from Replit DB response wrapper format
          const rawData = creditsData.value || creditsData;
          credits = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          console.log(`[CreditService] Loaded credits for user ${userId}: balance=${credits?.currentBalance}, transactions=${credits?.transactions?.length || 0}`);
        } catch (parseError) {
          console.error(`Error parsing credits data for user ${userId}:`, parseError);
          credits = undefined;
        }
      }
      
      if (!credits) {
        console.log(`[CreditService] No credits found for user ${userId}, creating initial record with 250 credits`);
        
        // Create initial credit record with 250 credit starting bonus
        const initialCredits: UserCredits = {
          currentBalance: 250,
          lastTopUp: Date.now(),
          totalUsed: 0,
          isBlocked: false,
          transactions: [{
            type: 'credit',
            amount: 250,
            description: 'Welcome bonus - 250 free credits',
            timestamp: Date.now()
          }],
          monthlyAllowance: MONTHLY_CREDIT_ALLOWANCE,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        console.log(`[CreditService] Creating initial credits for user ${userId}: 250 credits`);
        await db.set(key, JSON.stringify(initialCredits));
        console.log(`[CreditService] Successfully created initial credits for user ${userId}`);
        return initialCredits;
      }
      
      console.log(`[CreditService] Returning credits for user ${userId}: balance=${credits.currentBalance}`);
      return credits;
    } catch (error) {
      console.error(`Error getting credits for user ${userId}:`, error);
      // Return default credits on error
      return {
        currentBalance: 250,
        lastTopUp: Date.now(),
        totalUsed: 0,
        isBlocked: false,
        transactions: [{
          type: 'credit',
          amount: 250,
          description: 'Welcome bonus - 250 free credits (fallback)',
          timestamp: Date.now()
        }],
        monthlyAllowance: MONTHLY_CREDIT_ALLOWANCE,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
    }
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
      // Determine credit amount based on subscription status
      const isSubscribed = credits.subscriptionStatus === 'active' && credits.currentPlan;
      const creditAmount = isSubscribed && credits.currentPlan 
        ? STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES[credits.currentPlan]
        : MONTHLY_CREDIT_ALLOWANCE;

      const getPlanDescription = () => {
        if (!isSubscribed || !credits.currentPlan) return 'free tier';
        switch (credits.currentPlan) {
          case 'ugly-duckling': return 'The Duckling subscription (2,000 base + 3,000 bonus)';
          case 'duckin-awesome': return 'Mama Duck subscription (5,000 base + 10,000 bonus)';
          default: return `${credits.currentPlan} subscription`;
        }
      };
      const planDescription = getPlanDescription();

      const transaction: CreditTransaction = {
        type: 'credit',
        amount: creditAmount,
        description: `Monthly top-up for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} (${planDescription})`,
        timestamp: Date.now()
      };

      const updatedCredits: UserCredits = {
        ...credits,
        currentBalance: credits.currentBalance + creditAmount,
        lastTopUp: Date.now(),
        isBlocked: false, // Unblock user on monthly refresh
        transactions: [...credits.transactions, transaction],
        updatedAt: Date.now()
      };

      await db.set(this.getCreditKey(userId), JSON.stringify(updatedCredits));
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

    const transaction: CreditTransaction = {
      type: 'debit',
      amount,
      description: `${searchType.replace('_', ' ')} search`,
      timestamp: Date.now(),
      searchType,
      success
    };

    const newBalance = credits.currentBalance - amount;
    const isBlocked = newBalance < 0;

    const updatedCredits: UserCredits = {
      ...credits,
      currentBalance: newBalance,
      totalUsed: credits.totalUsed + amount,
      isBlocked,
      transactions: [...credits.transactions, transaction],
      updatedAt: Date.now()
    };

    await db.set(this.getCreditKey(userId), JSON.stringify(updatedCredits));

    console.log(`Credits deducted for user ${userId}: -${amount} credits for ${searchType} (success: ${success})`);
    console.log(`New balance: ${newBalance}, Blocked: ${isBlocked}`);

    return {
      success: true,
      newBalance,
      isBlocked,
      transaction
    };
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
    const credits = await this.getUserCredits(userId);
    return credits.currentBalance;
  }

  /**
   * Get credit transaction history
   */
  static async getCreditHistory(userId: number, limit: number = 50): Promise<CreditTransaction[]> {
    const credits = await this.getUserCredits(userId);
    return credits.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Claim Easter Egg bonus credits
   * @deprecated Use GamificationService.claimEasterEgg instead
   * Proxy method maintained for backward compatibility
   */
  static async claimEasterEgg(userId: number, query: string): Promise<{
    success: boolean; 
    message: string; 
    newBalance?: number;
    easterEgg?: EasterEgg;
  }> {
    return GamificationService.claimEasterEgg(userId, query);
  }

  /**
   * Check if badge has been earned by user
   * @deprecated Use GamificationService.hasEarnedBadge instead
   * Proxy method maintained for backward compatibility
   */
  static async hasEarnedBadge(userId: number, badgeId: number): Promise<boolean> {
    return GamificationService.hasEarnedBadge(userId, badgeId);
  }

  /**
   * Award badge to user
   * @deprecated Use GamificationService.awardBadge instead
   * Proxy method maintained for backward compatibility
   */
  static async awardBadge(userId: number, badgeId: number): Promise<void> {
    return GamificationService.awardBadge(userId, badgeId);
  }

  /**
   * Trigger badge if not already earned
   * @deprecated Use GamificationService.triggerBadge instead
   * Proxy method maintained for backward compatibility
   */
  static async triggerBadge(userId: number, trigger: string): Promise<{
    shouldShow: boolean;
    badge?: BadgeConfig;
  }> {
    return GamificationService.triggerBadge(userId, trigger);
  }

  /**
   * Check if notification has been shown to user
   * @deprecated Use GamificationService.hasShownNotification instead
   * Proxy method maintained for backward compatibility
   */
  static async hasShownNotification(userId: number, notificationId: number): Promise<boolean> {
    return GamificationService.hasShownNotification(userId, notificationId);
  }

  /**
   * Mark notification as shown
   * @deprecated Use GamificationService.markNotificationShown instead
   * Proxy method maintained for backward compatibility
   */
  static async markNotificationShown(userId: number, notificationId: number): Promise<void> {
    return GamificationService.markNotificationShown(userId, notificationId);
  }

  /**
   * Trigger notification if not already shown
   * @deprecated Use GamificationService.triggerNotification instead
   * Proxy method maintained for backward compatibility
   */
  static async triggerNotification(userId: number, trigger: string): Promise<{
    shouldShow: boolean;
    notification?: NotificationConfig;
    badge?: BadgeConfig;
  }> {
    return GamificationService.triggerNotification(userId, trigger);
  }

  /**
   * Manual credit adjustment (for admin use)
   */
  static async adjustCredits(
    userId: number, 
    amount: number, 
    description: string
  ): Promise<CreditDeductionResult> {
    const credits = await this.getUserCredits(userId);
    
    const transaction: CreditTransaction = {
      type: amount > 0 ? 'credit' : 'debit',
      amount: Math.abs(amount),
      description,
      timestamp: Date.now()
    };

    const newBalance = credits.currentBalance + amount;
    const isBlocked = newBalance < 0;

    const updatedCredits: UserCredits = {
      ...credits,
      currentBalance: newBalance,
      totalUsed: amount < 0 ? credits.totalUsed + Math.abs(amount) : credits.totalUsed,
      isBlocked,
      transactions: [...credits.transactions, transaction],
      updatedAt: Date.now()
    };

    await db.set(this.getCreditKey(userId), JSON.stringify(updatedCredits));

    return {
      success: true,
      newBalance,
      isBlocked,
      transaction
    };
  }

  /**
   * Get usage statistics for a user
   */
  static async getUsageStats(userId: number): Promise<{
    totalUsed: number;
    thisMonth: number;
    searchCounts: Record<string, number>;
  }> {
    const credits = await this.getUserCredits(userId);
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    const thisMonthTransactions = credits.transactions.filter(
      t => t.type === 'debit' && t.timestamp >= thisMonthStart
    );
    
    const thisMonthUsage = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const searchCounts: Record<string, number> = {};
    thisMonthTransactions.forEach(t => {
      if (t.searchType) {
        searchCounts[t.searchType] = (searchCounts[t.searchType] || 0) + 1;
      }
    });

    return {
      totalUsed: credits.totalUsed,
      thisMonth: thisMonthUsage,
      searchCounts
    };
  }

  /**
   * Update Stripe customer ID
   */
  static async updateStripeCustomerId(userId: number, customerId: string): Promise<void> {
    const credits = await this.getUserCredits(userId);
    credits.stripeCustomerId = customerId;
    credits.updatedAt = Date.now();
    
    await db.set(this.getCreditKey(userId), JSON.stringify(credits));
    console.log(`Updated Stripe customer ID for user ${userId}: ${customerId}`);
  }

  /**
   * Update subscription details
   */
  static async updateSubscription(userId: number, subscriptionData: {
    stripeSubscriptionId?: string;
    subscriptionStatus?: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing';
    currentPlan?: 'ugly-duckling';
    subscriptionStartDate?: number;
    subscriptionEndDate?: number;
  }): Promise<void> {
    const credits = await this.getUserCredits(userId);
    
    Object.assign(credits, subscriptionData);
    credits.updatedAt = Date.now();
    
    await db.set(this.getCreditKey(userId), JSON.stringify(credits));
    console.log(`Updated subscription for user ${userId}:`, subscriptionData);
  }

  /**
   * Award subscription credits immediately upon successful subscription
   */
  static async awardSubscriptionCredits(userId: number, planId: 'ugly-duckling'): Promise<void> {
    const credits = await this.getUserCredits(userId);
    const creditAmount = STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES[planId];

    const transaction: CreditTransaction = {
      type: 'credit',
      amount: creditAmount,
      description: `${planId} subscription activation bonus`,
      timestamp: Date.now()
    };

    const updatedCredits: UserCredits = {
      ...credits,
      currentBalance: credits.currentBalance + creditAmount,
      isBlocked: false, // Unblock user on subscription
      transactions: [...credits.transactions, transaction],
      updatedAt: Date.now()
    };

    await db.set(this.getCreditKey(userId), JSON.stringify(updatedCredits));
    console.log(`Awarded subscription credits for user ${userId}: +${creditAmount} credits for ${planId}`);
  }
}

export default CreditService;