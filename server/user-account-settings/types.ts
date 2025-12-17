/**
 * Type definitions for User Account Settings module
 */

import { Request } from 'express';
import { User } from '@shared/schema';

// Extend Express Request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Profile update request
export interface ProfileUpdateRequest {
  username?: string;
}

// Profile response
export interface ProfileResponse {
  id: number;
  email: string;
  username: string | null;
  createdAt: Date | null;
}

// Email preferences request/response types
export interface EmailPreferencesData {
  userId?: number;
  preferredMethod?: string;
  hasSeenFirstTimeModal?: boolean;
  hasSeenIOSNotification?: boolean;
  hasSeenAndroidNotification?: boolean;
  successCount?: number;
  failureCount?: number;
}