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

/**
 * Helper to make authenticated GET requests with both session cookie and Firebase token
 * This ensures requests work even when returning to an idle tab
 */
async function authorizedFetch(url: string): Promise<Response> {
  const headers: HeadersInit = {};
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return fetch(url, {
    credentials: 'include',
    headers
  });
}

export const userAccountApi = {
  // Profile endpoints
  getProfile: async (): Promise<UserProfile> => {
    const response = await authorizedFetch("/api/user/profile");
    if (!response.ok) throw new Error("Failed to fetch profile");
    return response.json();
  },

  updateProfile: async (data: ProfileFormData): Promise<UserProfile> => {
    const response = await apiRequest("PUT", "/api/user/profile", data);
    return response.json();
  },

  // User preferences endpoints
  getPreferences: async (): Promise<UserPreferences> => {
    const response = await authorizedFetch("/api/user/preferences");
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
    const response = await apiRequest("PUT", "/api/email-preferences", preferences);
    return response.json();
  },

  // Notification endpoints
  triggerNotification: async (trigger: string): Promise<any> => {
    return apiRequest("POST", "/api/notifications/trigger", { trigger });
  },

  markNotificationShown: async (data: { notificationId?: number; badgeId?: number }): Promise<any> => {
    return apiRequest("POST", "/api/notifications/mark-shown", data);
  },

  getNotificationStatus: async (): Promise<NotificationStatus> => {
    const response = await authorizedFetch("/api/notifications/status");
    if (!response.ok) throw new Error("Failed to fetch notification status");
    return response.json();
  },

  // Subscription endpoints
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    const response = await authorizedFetch("/api/user/subscription-status");
    if (!response.ok) throw new Error("Failed to fetch subscription status");
    return response.json();
  },

  // Credits endpoints
  getCredits: async (): Promise<CreditData> => {
    const response = await authorizedFetch("/api/credits");
    if (!response.ok) throw new Error("Failed to fetch credits");
    return response.json();
  },

  // Easter egg endpoint
  claimEasterEgg: async (query: string): Promise<EasterEggResult> => {
    const response = await apiRequest("POST", "/api/credits/easter-egg", { query });
    return response.json();
  }
};