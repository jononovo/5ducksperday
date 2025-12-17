/**
 * Service layer for User Account Settings functionality
 */

import { storage } from '../storage';
import type { 
  ProfileUpdateRequest, 
  ProfileResponse,
  EmailPreferencesData
} from './types';

export class UserAccountSettingsService {
  /**
   * Get user profile
   */
  static async getUserProfile(userId: number): Promise<ProfileResponse | null> {
    const user = await storage.getUserById(userId);
    
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt
    };
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: number, data: ProfileUpdateRequest): Promise<ProfileResponse | null> {
    const { username } = data;
    
    if (!username || typeof username !== 'string') {
      throw new Error('Username is required');
    }

    if (username.length < 1 || username.length > 50) {
      throw new Error('Username must be between 1 and 50 characters');
    }

    const updatedUser = await storage.updateUser(userId, { username });
    
    if (!updatedUser) {
      return null;
    }

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      username: updatedUser.username,
      createdAt: updatedUser.createdAt
    };
  }

  /**
   * Get user preferences
   */
  static async getUserPreferences(userId: number) {
    return await storage.getUserPreferences(userId) || {};
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(userId: number, preferences: any) {
    return await storage.updateUserPreferences(userId, preferences);
  }

  /**
   * Get or create email preferences
   */
  static async getEmailPreferences(userId: number) {
    let preferences = await storage.getUserEmailPreferences(userId);
    
    if (!preferences) {
      // Create default preferences
      preferences = await storage.createUserEmailPreferences({
        userId,
        preferredMethod: 'smart-default',
        hasSeenFirstTimeModal: false,
        hasSeenIOSNotification: false,
        hasSeenAndroidNotification: false,
        successCount: 0,
        failureCount: 0
      });
    }
    
    return preferences;
  }

  /**
   * Update email preferences
   */
  static async updateEmailPreferences(userId: number, updates: EmailPreferencesData) {
    // Remove userId from updates if present
    delete updates.userId;
    
    // Update preferences
    const updatedPreferences = await storage.updateUserEmailPreferences(userId, updates);
    
    if (!updatedPreferences) {
      // Create if doesn't exist
      return await storage.createUserEmailPreferences({
        userId,
        preferredMethod: 'smart-default',
        hasSeenFirstTimeModal: false,
        hasSeenIOSNotification: false,
        hasSeenAndroidNotification: false,
        successCount: 0,
        failureCount: 0,
        ...updates
      });
    }
    
    return updatedPreferences;
  }
}