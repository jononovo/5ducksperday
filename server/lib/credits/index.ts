import { UserCredits, CreditTransaction, SearchType, CreditDeductionResult, CREDIT_COSTS, MONTHLY_CREDIT_ALLOWANCE } from "./types";
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
      console.log(`[CreditService] Getting credits for user ${userId} with key: ${key}`);
      const creditsData = await db.get(key);
      console.log(`[CreditService] Raw DB data for user ${userId}:`, creditsData);
      
      let credits: UserCredits | undefined;
      
      if (creditsData && creditsData.ok !== false) {
        try {
          // Extract value from Replit DB response wrapper format
          const rawData = creditsData.value || creditsData;
          credits = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          console.log(`[CreditService] Parsed credits for user ${userId}:`, credits);
        } catch (parseError) {
          console.error(`Error parsing credits data for user ${userId}:`, parseError);
          credits = undefined;
        }
      }
      
      if (!credits) {
        console.log(`[CreditService] No credits found for user ${userId}, creating initial record with 180 credits`);
        
        // Create initial credit record with 180 credit starting bonus
        const initialCredits: UserCredits = {
          currentBalance: 180,
          lastTopUp: Date.now(),
          totalUsed: 0,
          isBlocked: false,
          transactions: [{
            type: 'credit',
            amount: 180,
            description: 'Welcome bonus - 180 free credits',
            timestamp: Date.now()
          }],
          monthlyAllowance: MONTHLY_CREDIT_ALLOWANCE,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        
        console.log(`[CreditService] Saving initial credits for user ${userId}:`, initialCredits);
        await db.set(key, JSON.stringify(initialCredits));
        console.log(`[CreditService] Successfully saved initial credits for user ${userId}`);
        return initialCredits;
      }
      
      console.log(`[CreditService] Returning existing credits for user ${userId}:`, credits);
      return credits;
    } catch (error) {
      console.error(`Error getting credits for user ${userId}:`, error);
      // Return default credits on error
      return {
        currentBalance: 180,
        lastTopUp: Date.now(),
        totalUsed: 0,
        isBlocked: false,
        transactions: [{
          type: 'credit',
          amount: 180,
          description: 'Welcome bonus - 180 free credits (fallback)',
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
      const transaction: CreditTransaction = {
        type: 'credit',
        amount: MONTHLY_CREDIT_ALLOWANCE,
        description: `Monthly top-up for ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        timestamp: Date.now()
      };

      const updatedCredits: UserCredits = {
        ...credits,
        currentBalance: credits.currentBalance + MONTHLY_CREDIT_ALLOWANCE,
        lastTopUp: Date.now(),
        isBlocked: false, // Unblock user on monthly refresh
        transactions: [...credits.transactions, transaction],
        updatedAt: Date.now()
      };

      await db.set(this.getCreditKey(userId), JSON.stringify(updatedCredits));
      console.log(`Applied monthly top-up for user ${userId}: +${MONTHLY_CREDIT_ALLOWANCE} credits`);
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
}

export default CreditService;