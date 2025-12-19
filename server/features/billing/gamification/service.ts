import { 
  EasterEgg, 
  EASTER_EGGS, 
  EasterEggResult
} from "./types";
import { storage } from '../../../storage';
import { CreditRewardService } from "../rewards/service";

export class GamificationService {
  /**
   * Claim Easter Egg bonus credits
   * Uses CreditRewardService.awardOneTimeCredits with proper rewardKey for idempotency
   */
  static async claimEasterEgg(userId: number, query: string): Promise<EasterEggResult> {
    const easterEgg = EASTER_EGGS.find(egg => 
      egg.trigger.toLowerCase() === query.toLowerCase().trim()
    );
    
    if (!easterEgg) {
      return { success: false, message: "Invalid easter egg" };
    }

    const rewardKey = `easter-egg:${easterEgg.trigger.toLowerCase().replace(/\s+/g, '-')}`;
    const description = `${easterEgg.emoji} ${easterEgg.description}`;
    
    try {
      const result = await CreditRewardService.awardOneTimeCredits(
        userId,
        easterEgg.reward,
        rewardKey,
        description
      );
      
      if (result.alreadyClaimed) {
        return { success: false, message: "Easter egg already claimed!" };
      }
      
      return { 
        success: true, 
        message: `🎉 Easter egg found! +${easterEgg.reward} credits added!`, 
        newBalance: result.newBalance,
        easterEgg 
      };
    } catch (error) {
      console.error(`Failed to claim easter egg for user ${userId}:`, error);
      return { success: false, message: "Failed to claim easter egg" };
    }
  }
  
  /**
   * Get user's claimed easter eggs
   * Uses rewardKey for reliable detection
   */
  static async getClaimedEasterEggs(userId: number): Promise<EasterEgg[]> {
    const history = await storage.getUserCreditHistory(userId, 200);
    const claimedEggs: EasterEgg[] = [];
    
    for (const egg of EASTER_EGGS) {
      const rewardKey = `easter-egg:${egg.trigger.toLowerCase().replace(/\s+/g, '-')}`;
      const claimed = history.some((tx: any) => tx.rewardKey === rewardKey);
      if (claimed) {
        claimedEggs.push(egg);
      }
    }
    
    return claimedEggs;
  }
}
