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
import { storage } from '../../../storage';

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

    // Check if already claimed by looking at credit history
    const history = await storage.getUserCreditHistory(userId, 100);
    const alreadyClaimed = history.some((tx: any) => 
      tx.description?.includes(easterEgg.emoji) && 
      tx.description?.includes(easterEgg.description)
    );
    
    if (alreadyClaimed) {
      return { success: false, message: "Easter egg already claimed!" };
    }

    // Award credits using PostgreSQL storage
    const description = `${easterEgg.emoji} ${easterEgg.description}`;
    
    try {
      const result = await storage.updateUserCredits(userId, easterEgg.reward, 'bonus', description);
      
      return { 
        success: true, 
        message: `🎉 Easter egg found! +${easterEgg.reward} credits added!`, 
        newBalance: result.balance,
        easterEgg 
      };
    } catch (error) {
      console.error(`Failed to claim easter egg for user ${userId}:`, error);
      return { success: false, message: "Failed to claim easter egg" };
    }
  }

  /**
   * Check if badge has been earned by user
   */
  static async hasEarnedBadge(userId: number, badgeId: number): Promise<boolean> {
    // Check notifications for badge awards
    const notifications = await storage.getUserNotifications(userId);
    return notifications.some((n: any) => 
      n.type === 'badge' && n.metadata?.badgeId === badgeId
    );
  }

  /**
   * Award badge to user
   */
  static async awardBadge(userId: number, badgeId: number): Promise<void> {
    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return;
    
    // Check if already awarded
    const hasEarned = await this.hasEarnedBadge(userId, badgeId);
    if (hasEarned) return;
    
    // Create notification for badge award
    await storage.createUserNotification(userId, {
      type: 'badge',
      title: `Badge Unlocked: ${badge.title}`,
      message: badge.description,
      priority: 'high',
      metadata: { badgeId, badge }
    });
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
    const notifications = await storage.getUserNotifications(userId);
    return notifications.some((n: any) => 
      n.type === 'notification' && 
      n.metadata?.notificationId === notificationId &&
      (n.status === 'read' || n.status === 'dismissed')
    );
  }

  /**
   * Mark notification as shown
   */
  static async markNotificationShown(userId: number, notificationId: number): Promise<void> {
    const notification = NOTIFICATIONS.find(n => n.id === notificationId);
    if (!notification) return;
    
    // Check if already exists
    const hasShown = await this.hasShownNotification(userId, notificationId);
    if (hasShown) return;
    
    // Create notification record
    const created = await storage.createUserNotification(userId, {
      type: 'notification',
      title: notification.title,
      message: notification.description,
      priority: 'normal',
      metadata: { notificationId, notification }
    });
    
    // Immediately mark as read
    if (created?.id) {
      await storage.markNotificationAsRead(created.id);
    }
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
   * Award badge for specific milestones
   */
  static async checkAndAwardMilestoneBadges(userId: number, searchCount: number): Promise<void> {
    // First search badge
    if (searchCount === 1) {
      await this.awardBadge(userId, 0); // First Steps badge
    }
    
    // Power user badge (50 searches)
    if (searchCount === 50) {
      await this.awardBadge(userId, 2); // Power User badge
    }
    
    // Veteran badge (100 searches)
    if (searchCount === 100) {
      await this.awardBadge(userId, 3); // Veteran badge
    }
  }
  
  /**
   * Get user's earned badges
   */
  static async getUserBadges(userId: number): Promise<BadgeConfig[]> {
    const notifications = await storage.getUserNotifications(userId);
    const badgeIds = notifications
      .filter((n: any) => n.type === 'badge' && n.metadata?.badgeId !== undefined)
      .map((n: any) => n.metadata.badgeId);
    
    return BADGES.filter(b => badgeIds.includes(b.id));
  }
  
  /**
   * Get user's claimed easter eggs
   */
  static async getClaimedEasterEggs(userId: number): Promise<EasterEgg[]> {
    const history = await storage.getUserCreditHistory(userId, 100);
    const claimedEggs: EasterEgg[] = [];
    
    for (const egg of EASTER_EGGS) {
      const claimed = history.some((tx: any) => 
        tx.description?.includes(egg.emoji) && 
        tx.description?.includes(egg.description)
      );
      if (claimed) {
        claimedEggs.push(egg);
      }
    }
    
    return claimedEggs;
  }
}