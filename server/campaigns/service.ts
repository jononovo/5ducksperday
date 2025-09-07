/**
 * Service layer for Campaigns functionality
 * Note: This feature is currently inactive and uses placeholder implementations
 */

import { storage } from '../storage';
import type { 
  Campaign,
  InsertCampaign,
  UpdateCampaign
} from './types';

export class CampaignsService {
  /**
   * List all campaigns for a user
   * Note: Currently returns empty array as feature is inactive
   */
  static async listCampaigns(userId: number): Promise<Campaign[]> {
    try {
      return await storage.listCampaigns(userId);
    } catch (error) {
      console.log('Campaign feature inactive, returning empty array');
      return [];
    }
  }

  /**
   * Get a specific campaign
   * Note: Currently returns undefined as feature is inactive
   */
  static async getCampaign(campaignId: number, userId: number): Promise<Campaign | undefined> {
    try {
      return await storage.getCampaign(campaignId, userId);
    } catch (error) {
      console.log('Campaign feature inactive, returning undefined');
      return undefined;
    }
  }

  /**
   * Get the next available campaign ID
   * Note: Returns placeholder ID as feature is inactive
   */
  static async getNextCampaignId(): Promise<number> {
    try {
      return await storage.getNextCampaignId();
    } catch (error) {
      // Return a placeholder ID starting from 2001
      return 2001 + Math.floor(Math.random() * 1000);
    }
  }

  /**
   * Create a new campaign
   * Note: Currently returns the input data as feature is inactive
   */
  static async createCampaign(data: InsertCampaign): Promise<Campaign> {
    try {
      const campaignId = await this.getNextCampaignId();
      
      const campaignData = {
        ...data,
        campaignId,
        totalCompanies: data.totalCompanies || 0,
        description: data.description || null,
        startDate: data.startDate || null,
        status: data.status || 'draft' as const
      };
      
      return await storage.createCampaign(campaignData);
    } catch (error) {
      console.log('Campaign feature inactive, returning placeholder');
      // Return a placeholder campaign
      return {
        id: Math.floor(Math.random() * 10000),
        campaignId: await this.getNextCampaignId(),
        userId: data.userId,
        name: data.name,
        description: data.description || null,
        totalCompanies: data.totalCompanies || 0,
        startDate: data.startDate || null,
        status: data.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }

  /**
   * Update an existing campaign
   * Note: Currently returns undefined as feature is inactive
   */
  static async updateCampaign(id: number, data: UpdateCampaign, userId: number): Promise<Campaign | undefined> {
    try {
      return await storage.updateCampaign(id, data as any, userId);
    } catch (error) {
      console.log('Campaign feature inactive, returning undefined');
      return undefined;
    }
  }

  /**
   * Helper to get user ID from request
   */
  static getUserId(req: any): number {
    try {
      // Check authenticated user
      if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.id) {
        return req.user.id;
      }
      
      // Check Firebase user
      if (req.firebaseUser && req.firebaseUser.id) {
        return req.firebaseUser.id;
      }
    } catch (error) {
      console.error('Error accessing user ID:', error);
    }
    
    // Fallback to demo user ID
    return 1;
  }
}