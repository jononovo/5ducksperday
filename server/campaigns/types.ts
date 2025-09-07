/**
 * Type definitions for Campaigns module
 * Note: This feature is currently inactive
 */

import { Request } from 'express';

// Campaign data structure
export interface Campaign {
  id: number;
  campaignId: number;
  userId: number;
  name: string;
  description?: string | null;
  totalCompanies: number;
  startDate?: Date | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
}

// Insert campaign request
export interface InsertCampaign {
  campaignId?: number;
  userId: number;
  name: string;
  description?: string | null;
  totalCompanies?: number;
  startDate?: Date | null;
  status?: 'draft' | 'active' | 'paused' | 'completed';
}

// Update campaign request
export interface UpdateCampaign {
  name?: string;
  description?: string | null;
  totalCompanies?: number;
  startDate?: Date | null;
  status?: 'draft' | 'active' | 'paused' | 'completed';
}

// Authenticated request
export interface AuthenticatedRequest extends Request {
  user?: any;
}