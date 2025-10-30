import { UserCredits, CreditTransaction, SearchType, CreditDeductionResult, CREDIT_COSTS, MONTHLY_CREDIT_ALLOWANCE, EasterEgg, EASTER_EGGS, NotificationConfig, NOTIFICATIONS, BadgeConfig, BADGES, STRIPE_CONFIG } from "./types";
import { GamificationService } from '../gamification/service';
import { storage } from '../../../storage';

export class CreditService {
  /**
   * Get user credits, creating initial record if needed
   */
  static async getUserCredits(userId: number): Promise<UserCredits> {
    try {
      console.log(`[CreditService] Getting credits for user ${userId}`);
      
      // Get credits from PostgreSQL
      const creditData = await storage.getUserCredits(userId);
      
      if (!creditData) {
        console.log(`[CreditService] No credits found for user ${userId}, creating initial record with 250 credits`);
        
        // Create initial credit record with 250 credit starting bonus
        await storage.updateUserCredits(userId, 250, 'bonus', 'Welcome bonus - 250 free credits');
        
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
        
        console.log(`[CreditService] Successfully created initial credits for user ${userId}`);
        return initialCredits;
      }
      
      // Get transaction history
      const transactions = await storage.getUserCreditHistory(userId);
      
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
        // Preserve subscription and easter egg data
        subscriptionStatus: undefined,
        currentPlan: undefined,
        easterEggs: [],
        badges: []
      };
      
      console.log(`[CreditService] Loaded credits for user ${userId}: balance=${userCredits.currentBalance}`);
      return userCredits;
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
      // Get subscription status from PostgreSQL
      const subscription = await storage.getUserSubscription(userId);
      const isSubscribed = subscription?.status === 'active' && subscription?.planId;
      
      const creditAmount = isSubscribed && subscription.planId
        ? STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES[subscription.planId as keyof typeof STRIPE_CONFIG.PLAN_CREDIT_ALLOWANCES] || MONTHLY_CREDIT_ALLOWANCE
        : MONTHLY_CREDIT_ALLOWANCE;

      const getPlanDescription = () => {
        if (!isSubscribed || !subscription?.planId) return 'free tier';
        switch (subscription.planId) {
          case 'ugly-duckling': return 'The Duckling subscription (2,000 base + 3,000 bonus)';
          case 'duckin-awesome': return 'Mama Duck subscription (5,000 base + 10,000 bonus)';
          default: return `${subscription.planId} subscription`;
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
   * Check if notification has been shown
   * @deprecated Use GamificationService methods instead
   * Proxy method maintained for backward compatibility
   */
  static async hasNotificationBeenShown(userId: number, notificationId: string): Promise<boolean> {
    // Check if notification exists in PostgreSQL
    const notifications = await storage.getUserNotifications(userId, 'read');
    return notifications.some((n: any) => n.id === notificationId || n.type === notificationId);
  }

  /**
   * Mark notification as shown
   * @deprecated Use GamificationService.markNotificationShown instead
   * Proxy method maintained for backward compatibility
   */
  static async markNotificationShown(userId: number, notificationId: string): Promise<void> {
    // Convert string ID to number if it's a numeric string
    const id = parseInt(notificationId, 10);
    if (!isNaN(id)) {
      await storage.markNotificationAsRead(id);
    }
  }

  /**
   * Trigger notification for user
   * @deprecated Use GamificationService.triggerNotification instead
   * Proxy method maintained for backward compatibility
   */
  static async triggerNotification(userId: number, notificationId: string): Promise<{ shouldShow: boolean; notification?: any }> {
    return GamificationService.triggerNotification(userId, notificationId);
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
}