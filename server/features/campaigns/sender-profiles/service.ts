import { storage } from '../../../storage';
import type { InsertSenderProfile, SenderProfile } from '@shared/schema';

export class SenderProfileService {
  /**
   * Creates a new sender profile, ensuring only one default per user
   */
  async createSenderProfile(data: InsertSenderProfile): Promise<SenderProfile> {
    // If setting as default, clear other defaults first
    if (data.isDefault === true) {
      await this.clearDefaultProfiles(data.userId);
    }
    
    return await storage.createSenderProfile(data);
  }

  /**
   * Updates a sender profile, ensuring only one default per user
   */
  async updateSenderProfile(id: number, userId: number, data: Partial<SenderProfile>): Promise<SenderProfile> {
    // If setting as default, clear other defaults first
    if (data.isDefault === true) {
      await this.clearDefaultProfiles(userId);
    }
    
    return await storage.updateSenderProfile(id, data);
  }

  /**
   * Clears default status from all sender profiles for a user
   */
  private async clearDefaultProfiles(userId: number): Promise<void> {
    const profiles = await storage.listSenderProfiles(userId);
    
    // Clear default status from all profiles
    for (const profile of profiles) {
      if (profile.isDefault) {
        await storage.updateSenderProfile(profile.id, { isDefault: false });
      }
    }
  }

  /**
   * Auto-generates a default profile for a user if they have none
   */
  async ensureDefaultProfile(userId: number): Promise<SenderProfile[]> {
    let profiles = await storage.listSenderProfiles(userId);
    
    if (profiles.length === 0) {
      console.log(`Auto-generating default sender profile for user ${userId}`);
      
      // Get user details to create default profile
      const user = await storage.getUserById(userId);
      if (user) {
        const defaultProfile = await this.createSenderProfile({
          userId,
          displayName: user.username || user.email.split('@')[0],
          email: user.email,
          isDefault: true,
          source: 'registered' // Auto-generated profile from registered user
        });
        profiles = [defaultProfile];
      }
    }
    
    return profiles;
  }

  /**
   * Gets the default profile or the first one if no default exists
   */
  async getDefaultProfile(userId: number): Promise<SenderProfile | null> {
    const profiles = await this.ensureDefaultProfile(userId);
    
    if (profiles.length === 0) {
      return null;
    }
    
    // Find the default profile or return the first one
    return profiles.find(p => p.isDefault) || profiles[0];
  }
}

export const senderProfileService = new SenderProfileService();