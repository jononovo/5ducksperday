import { CreditService } from "../credits/service";
import { CreditTransaction } from "../credits/types";
import { 
  EasterEgg, 
  EASTER_EGGS, 
  NotificationConfig, 
  NOTIFICATIONS, 
  BadgeConfig, 
  BADGES,
  EasterEggResult,
  NotificationResult,
  BadgeResult
} from "./types";
import Database from '@replit/database';

const db = new Database();

export class GamificationService {
  /**
   * Claim Easter Egg bonus credits
   */
  static async claimEasterEgg(userId: number, query: string): Promise<EasterEggResult> {
    // Find matching easter egg by trigger (case-insensitive)
    const easterEgg = EASTER_EGGS.find(egg => 
      egg.trigger.toLowerCase() === query.toLowerCase().trim()
    );
    
    if (!easterEgg) {
      return { success: false, message: "Invalid easter egg" };
    }

    const credits = await CreditService.getUserCredits(userId);
    const easterEggArray = credits.easterEggs || [];
    
    // Check if already used
    if (easterEggArray[easterEgg.id] === 1) {
      return { success: false, message: "Easter egg already claimed!" };
    }

    // Award credits and mark as used
    const transaction: CreditTransaction = {
      type: 'credit',
      amount: easterEgg.reward,
      description: `${easterEgg.emoji} ${easterEgg.description}`,
      timestamp: Date.now()
    };

    // Update easter egg tracking array
    const updatedEasterEggs = [...easterEggArray];
    updatedEasterEggs[easterEgg.id] = 1;

    const updatedCredits = {
      ...credits,
      currentBalance: credits.currentBalance + easterEgg.reward,
      isBlocked: credits.currentBalance + easterEgg.reward >= 0 ? false : credits.isBlocked,
      transactions: [transaction, ...credits.transactions],
      easterEggs: updatedEasterEggs,
      updatedAt: Date.now()
    };

    // Save using CreditService's internal key format
    const creditKey = `user_credits:${userId}`;
    await db.set(creditKey, JSON.stringify(updatedCredits));
    
    return { 
      success: true, 
      message: `🎉 Easter egg found! +${easterEgg.reward} credits added!`, 
      newBalance: updatedCredits.currentBalance,
      easterEgg 
    };
  }

  /**
   * Check if badge has been earned by user
   */
  static async hasEarnedBadge(userId: number, badgeId: number): Promise<boolean> {
    const credits = await CreditService.getUserCredits(userId);
    const badges = credits.badges || [];
    return badges[badgeId] === 1;
  }

  /**
   * Award badge to user
   */
  static async awardBadge(userId: number, badgeId: number): Promise<void> {
    const credits = await CreditService.getUserCredits(userId);
    const badges = credits.badges || [];
    
    // Update tracking array
    const updated = [...badges];
    updated[badgeId] = 1;
    
    const updatedCredits = {
      ...credits,
      badges: updated,
      updatedAt: Date.now()
    };
    
    // Save using CreditService's internal key format
    const creditKey = `user_credits:${userId}`;
    await db.set(creditKey, JSON.stringify(updatedCredits));
  }

  /**
   * Trigger badge if not already earned
   */
  static async triggerBadge(userId: number, trigger: string): Promise<BadgeResult> {
    const badge = BADGES.find(b => b.trigger === trigger);
    if (!badge) {
      return { shouldShow: false };
    }

    const hasEarned = await this.hasEarnedBadge(userId, badge.id);
    if (hasEarned) {
      return { shouldShow: false };
    }

    return { shouldShow: true, badge };
  }

  /**
   * Check if notification has been shown to user
   */
  static async hasShownNotification(userId: number, notificationId: number): Promise<boolean> {
    const credits = await CreditService.getUserCredits(userId);
    const notifications = credits.notifications || [];
    return notifications[notificationId] === 1;
  }

  /**
   * Mark notification as shown
   */
  static async markNotificationShown(userId: number, notificationId: number): Promise<void> {
    const credits = await CreditService.getUserCredits(userId);
    const notifications = credits.notifications || [];
    
    // Update tracking array
    const updated = [...notifications];
    updated[notificationId] = 1;
    
    const updatedCredits = {
      ...credits,
      notifications: updated,
      updatedAt: Date.now()
    };
    
    // Save using CreditService's internal key format
    const creditKey = `user_credits:${userId}`;
    await db.set(creditKey, JSON.stringify(updatedCredits));
  }

  /**
   * Trigger notification if not already shown
   */
  static async triggerNotification(userId: number, trigger: string): Promise<NotificationResult> {
    // Check if it's a badge first
    const badge = BADGES.find(b => b.trigger === trigger);
    if (badge) {
      const badgeResult = await this.triggerBadge(userId, trigger);
      return { 
        shouldShow: badgeResult.shouldShow, 
        badge: badgeResult.badge 
      };
    }

    // Otherwise check notifications
    const notification = NOTIFICATIONS.find(n => n.trigger === trigger);
    if (!notification) {
      return { shouldShow: false };
    }

    const hasShown = await this.hasShownNotification(userId, notification.id);
    if (hasShown) {
      return { shouldShow: false };
    }

    return { shouldShow: true, notification };
  }

  /**
   * Get all Easter eggs
   */
  static getEasterEggs(): EasterEgg[] {
    return EASTER_EGGS;
  }

  /**
   * Get all badges
   */
  static getBadges(): BadgeConfig[] {
    return BADGES;
  }

  /**
   * Get all notifications
   */
  static getNotifications(): NotificationConfig[] {
    return NOTIFICATIONS;
  }

  /**
   * Get user's gamification status
   */
  static async getUserGamificationStatus(userId: number): Promise<{
    easterEggs: number[];
    badges: number[];
    notifications: number[];
  }> {
    const credits = await CreditService.getUserCredits(userId);
    return {
      easterEggs: credits.easterEggs || [],
      badges: credits.badges || [],
      notifications: credits.notifications || []
    };
  }
}