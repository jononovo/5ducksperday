/**
 * Type definitions for User Account Settings feature
 * Mirrors the backend types for consistency
 */

// User Profile types
export interface UserProfile {
  id: number;
  email: string;
  username: string;
  createdAt: string;
}

export interface ProfileFormData {
  username: string;
}

// Subscription types
export interface SubscriptionStatus {
  isSubscribed: boolean;
  currentPlan: string | null;
  planDisplayName: string | null;
  hasSubscription?: boolean;
  status?: string | null;
}

// User Preferences types
export interface UserPreferences {
  [key: string]: any; // Generic preferences object
}

// Email Preferences types
export type EmailPreference = 'smart-default' | 'gmail' | 'outlook' | 'default-app' | 'ask-always';

export interface UserEmailPreferences {
  id?: number;
  userId: number;
  preferredMethod: EmailPreference;
  hasSeenFirstTimeModal: boolean;
  hasSeenIOSNotification: boolean;
  hasSeenAndroidNotification: boolean;
  successCount: number;
  failureCount: number;
  lastUsedMethod?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Notification types
export interface NotificationConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'feature_unlock' | 'milestone';
  trigger: string;
  title: string;
  description: string;
  badge?: string;
  emoji?: string;
  buttonText?: string;
}

export interface BadgeConfig {
  id: number;
  type: 'welcome' | 'achievement' | 'milestone' | 'special';
  trigger: string;
  title: string;
  description: string;
  badge: string;
  emoji?: string;
  buttonText?: string;
}

export interface NotificationState {
  isOpen: boolean;
  notification: NotificationConfig | null;
  badge: BadgeConfig | null;
}

export interface NotificationStatus {
  notifications: number[] | null;
  badges: number[] | null;
  isWaitlistMember: boolean;
  hasHatchlingBadge?: boolean;
}

// Credit types (related to user account)
export interface CreditData {
  balance: number;
  isBlocked: boolean;
  lastTopUp: number;
  totalUsed: number;
  monthlyAllowance: number;
}

// Easter egg types
export interface EasterEggResult {
  success: boolean;
  message?: string;
  creditsAwarded?: number;
}