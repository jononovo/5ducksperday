/**
 * API service for User Account Settings
 * Consolidates all user account related API calls
 */

import { apiRequest } from "@/lib/queryClient";
import type {
  UserProfile,
  ProfileFormData,
  SubscriptionStatus,
  UserPreferences,
  UserEmailPreferences,
  NotificationStatus,
  EasterEggResult,
  CreditData
} from "../types";

export const userAccountApi = {
  // Profile endpoints
  getProfile: async (): Promise<UserProfile> => {
    const response = await fetch("/api/user/profile", {
      credentials: 'include'
    });
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
  },

  updateProfile: async (data: ProfileFormData): Promise<UserProfile> => {
    return apiRequest("PUT", "/api/user/profile", data);
  },

  // User preferences endpoints
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await fetch("/api/user/preferences", {
      credentials: 'include'
    });
    if (!response.ok) throw new Error("Failed to fetch preferences");
    return response.json();
  },

  updatePreferences: async (preferences: UserPreferences): Promise<UserPreferences> => {
    return apiRequest("POST", "/api/user/preferences", preferences);
  },

  // Email preferences endpoints
  getEmailPreferences: async (): Promise<UserEmailPreferences> => {
    const response = await apiRequest("GET", "/api/email-preferences");
    if (!response.ok) throw new Error("Failed to fetch email preferences");
    return response.json();
  },

  updateEmailPreferences: async (preferences: Partial<UserEmailPreferences>): Promise<UserEmailPreferences> => {
    return apiRequest("PUT", "/api/email-preferences", preferences);
  },

  // Notification endpoints
  triggerNotification: async (trigger: string): Promise<any> => {
    return apiRequest("POST", "/api/notifications/trigger", { trigger });
  },

  markNotificationShown: async (data: { notificationId?: number; badgeId?: number }): Promise<any> => {
    return apiRequest("POST", "/api/notifications/mark-shown", data);
  },

  getNotificationStatus: async (): Promise<NotificationStatus> => {
    const response = await fetch("/api/notifications/status", {
      credentials: 'include'
    });
    if (!response.ok) throw new Error("Failed to fetch notification status");
    return response.json();
  },

  // Subscription endpoints
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    const response = await fetch("/api/user/subscription-status", {
      credentials: 'include'
    });
    if (!response.ok) throw new Error("Failed to fetch subscription status");
    return response.json();
  },

  // Credits endpoints
  getCredits: async (): Promise<CreditData> => {
    const response = await fetch("/api/credits", {
      credentials: 'include'
    });
    if (!response.ok) throw new Error("Failed to fetch credits");
    return response.json();
  },

  // Easter egg endpoint
  claimEasterEgg: async (query: string): Promise<EasterEggResult> => {
    return apiRequest("POST", "/api/credits/easter-egg", { query });
  }
};