import { storage } from '../../../storage';

export interface OneTimeRewardResult {
  success: boolean;
  credited: boolean;
  newBalance: number;
  alreadyClaimed: boolean;
  amount?: number;
  rewardKey?: string;
}

export class CreditRewardService {
  /**
   * Award one-time credits to a user.
   * This is the unified function for all credit rewards across features:
   * - Challenge completions
   * - Onboarding section completions
   * - Easter eggs
   * 
   * Features control the amount. The rewardKey ensures idempotency.
   * 
   * @param userId - The user receiving credits
   * @param amount - Amount of credits to award (defined by the feature)
   * @param rewardKey - Unique key for this reward (e.g., "challenge:basic-search", "onboarding:section-a")
   * @param description - Optional human-readable description for transaction history
   */
  static async awardOneTimeCredits(
    userId: number,
    amount: number,
    rewardKey: string,
    description?: string
  ): Promise<OneTimeRewardResult> {
    console.log(`[CreditRewardService] Attempting to award ${amount} credits to user ${userId} for ${rewardKey}`);
    
    try {
      const result = await storage.awardOneTimeCredits(userId, amount, rewardKey, description);
      
      if (result.credited) {
        console.log(`[CreditRewardService] Successfully awarded ${amount} credits to user ${userId} for ${rewardKey}. New balance: ${result.newBalance}`);
      } else {
        console.log(`[CreditRewardService] Reward ${rewardKey} already claimed by user ${userId}`);
      }
      
      return {
        ...result,
        amount,
        rewardKey
      };
    } catch (error) {
      console.error(`[CreditRewardService] Failed to award credits for ${rewardKey}:`, error);
      throw error;
    }
  }

  /**
   * Check if a reward has already been claimed by a user
   */
  static async hasClaimedReward(userId: number, rewardKey: string): Promise<boolean> {
    const history = await storage.getUserCreditHistory(userId, 200);
    return history.some((tx: any) => tx.rewardKey === rewardKey);
  }

  /**
   * Award challenge completion credits
   * Convenience wrapper with standard prefix
   */
  static async awardChallengeCredits(
    userId: number,
    challengeId: string,
    credits: number
  ): Promise<OneTimeRewardResult> {
    const rewardKey = `challenge:${challengeId}`;
    const description = `🏆 Challenge completed: ${challengeId}`;
    return this.awardOneTimeCredits(userId, credits, rewardKey, description);
  }

  /**
   * Award onboarding section credits
   * Convenience wrapper with standard prefix
   */
  static async awardOnboardingCredits(
    userId: number,
    sectionId: string,
    credits: number
  ): Promise<OneTimeRewardResult> {
    const rewardKey = `onboarding:${sectionId}`;
    const description = `📋 Onboarding section completed: ${sectionId}`;
    return this.awardOneTimeCredits(userId, credits, rewardKey, description);
  }
}
