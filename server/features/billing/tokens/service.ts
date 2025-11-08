import { UserTokens, TokenValidationResult } from "./types";
import { storage } from "../../../storage";

export class TokenService {
  /**
   * Save user tokens to PostgreSQL (replaces Replit DB)
   */
  static async saveUserTokens(userId: number, tokens: UserTokens): Promise<void> {
    try {
      console.log(`[TokenService] Saving tokens for user ${userId} to PostgreSQL`);
      
      await storage.saveOAuthToken(userId, 'gmail', {
        accessToken: tokens.gmailAccessToken,
        refreshToken: tokens.gmailRefreshToken,
        expiresAt: tokens.tokenExpiry ? new Date(tokens.tokenExpiry) : undefined,
        email: tokens.gmailEmail,
        scopes: tokens.scopes || [],
        metadata: {
          displayName: tokens.gmailDisplayName,
          createdAt: tokens.createdAt,
          updatedAt: tokens.updatedAt
        }
      });
      
      console.log(`[TokenService] Successfully saved tokens for user ${userId}`);
    } catch (error) {
      console.error(`Error saving tokens for user ${userId}:`, error);
      throw new Error(`Failed to save user tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user tokens from PostgreSQL
   */
  static async getUserTokens(userId: number): Promise<UserTokens | null> {
    try {
      console.log(`[TokenService] Getting tokens for user ${userId} from PostgreSQL`);
      
      const tokenData = await storage.getOAuthToken(userId, 'gmail');
      
      if (!tokenData) {
        console.log(`[TokenService] No tokens found for user ${userId}`);
        return null;
      }

      // Convert from PostgreSQL format to UserTokens format
      const tokens: UserTokens = {
        gmailAccessToken: tokenData.accessToken,
        gmailRefreshToken: tokenData.refreshToken,
        tokenExpiry: tokenData.expiresAt ? tokenData.expiresAt.getTime() : Date.now() + (3600 * 1000),
        scopes: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gmailEmail: tokenData.email,
        gmailDisplayName: undefined
      };
      
      console.log(`[TokenService] Successfully retrieved tokens for user ${userId}`);
      return tokens;
    } catch (error) {
      console.error(`Error getting tokens for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Update only the Gmail access token (for refresh scenarios)
   */
  static async updateGmailToken(userId: number, accessToken: string, tokenExpiry?: number): Promise<boolean> {
    try {
      const existingTokens = await this.getUserTokens(userId);
      if (!existingTokens) {
        console.warn(`[TokenService] Cannot update Gmail token - no existing tokens for user ${userId}`);
        return false;
      }

      const updatedTokens: UserTokens = {
        ...existingTokens,
        gmailAccessToken: accessToken,
        tokenExpiry: tokenExpiry || (Date.now() + (3600 * 1000)), // Default 1 hour if not provided
        updatedAt: Date.now()
      };

      await this.saveUserTokens(userId, updatedTokens);
      console.log(`[TokenService] Successfully updated Gmail token for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Error updating Gmail token for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Delete user tokens from PostgreSQL
   */
  static async deleteUserTokens(userId: number): Promise<void> {
    try {
      console.log(`[TokenService] Deleting tokens for user ${userId}`);
      await storage.deleteOAuthToken(userId, 'gmail');
      console.log(`[TokenService] Successfully deleted tokens for user ${userId}`);
    } catch (error) {
      console.error(`Error deleting tokens for user ${userId}:`, error);
      throw new Error(`Failed to delete user tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate if tokens are present and not expired
   */
  static isTokenValid(tokens: UserTokens | null): TokenValidationResult {
    if (!tokens) {
      return {
        isValid: false,
        isExpired: false,
        needsRefresh: false
      };
    }

    const now = Date.now();
    const timeUntilExpiry = tokens.tokenExpiry - now;
    const isExpired = timeUntilExpiry <= 0;
    const needsRefresh = timeUntilExpiry <= (5 * 60 * 1000); // Refresh if expires within 5 minutes

    return {
      isValid: !isExpired && !!tokens.gmailAccessToken,
      isExpired,
      needsRefresh,
      remainingTime: Math.max(0, timeUntilExpiry)
    };
  }

  /**
   * Store Gmail tokens after OAuth flow
   */
  static async storeGmailTokens(userId: number, gmailTokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
  }, gmailUserInfo?: {
    email: string;
    name: string;
  }): Promise<void> {
    try {
      const existingTokens = await this.getUserTokens(userId);
      
      const tokens: UserTokens = {
        gmailAccessToken: gmailTokens.access_token,
        gmailRefreshToken: gmailTokens.refresh_token,
        tokenExpiry: gmailTokens.expiry_date || (Date.now() + (3600 * 1000)), // Default 1 hour
        scopes: ['https://www.googleapis.com/auth/gmail.modify', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
        createdAt: existingTokens?.createdAt || Date.now(),
        updatedAt: Date.now(),
        gmailEmail: gmailUserInfo?.email,
        gmailDisplayName: gmailUserInfo?.name
      };
      
      await this.saveUserTokens(userId, tokens);
      console.log(`[TokenService] Successfully stored Gmail tokens for user ${userId}`);
    } catch (error) {
      console.error(`Error storing Gmail tokens for user ${userId}:`, error);
      throw new Error(`Failed to store Gmail tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if user has valid Gmail authentication
   */
  static async hasValidGmailAuth(userId: number): Promise<boolean> {
    try {
      const tokens = await this.getUserTokens(userId);
      const validationResult = this.isTokenValid(tokens);
      
      console.log(`Checking Gmail auth status: {
        userId: ${userId},
        hasValidAuth: ${validationResult.isValid},
        needsRefresh: ${validationResult.needsRefresh},
        isExpired: ${validationResult.isExpired},
        timestamp: '${new Date().toISOString()}'
      }`);
      
      // If token is expired or needs refresh, attempt to refresh it
      if (tokens?.gmailRefreshToken && (validationResult.isExpired || validationResult.needsRefresh)) {
        console.log(`[TokenService] Token expired or needs refresh for user ${userId}, attempting refresh...`);
        const refreshSuccess = await this.refreshGmailToken(userId);
        
        if (refreshSuccess) {
          console.log(`[TokenService] Token refresh successful for user ${userId}`);
          return true; // Token was refreshed successfully
        } else {
          console.log(`[TokenService] Token refresh failed for user ${userId}`);
          return false; // Refresh failed, auth is invalid
        }
      }
      
      return validationResult.isValid;
    } catch (error) {
      console.error(`Error checking Gmail auth for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Refresh Gmail access token using refresh token
   */
  static async refreshGmailToken(userId: number): Promise<boolean> {
    try {
      const tokens = await this.getUserTokens(userId);
      if (!tokens?.gmailRefreshToken) {
        console.warn(`[TokenService] Cannot refresh token - no refresh token for user ${userId}`);
        return false;
      }

      console.log(`[TokenService] Attempting to refresh Gmail token for user ${userId}`);

      // Import Google OAuth2 module at runtime
      const { google } = await import('googleapis');
      
      // Create OAuth2 client with correct Gmail API credentials (not Firebase)
      const oauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET
        // No redirect URI needed for refresh
      );

      // Set refresh token
      oauth2Client.setCredentials({
        refresh_token: tokens.gmailRefreshToken
      });

      // Request new access token using Google OAuth2 library
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        console.warn(`[TokenService] Token refresh failed - no access token received for user ${userId}`);
        return false;
      }

      // Update stored token with new access token and expiry
      const success = await this.updateGmailToken(
        userId, 
        credentials.access_token,
        credentials.expiry_date || undefined
      );

      if (success) {
        console.log(`[TokenService] Successfully refreshed Gmail token for user ${userId}`);
        return true;
      } else {
        console.warn(`[TokenService] Failed to store refreshed token for user ${userId}`);
        return false;
      }
    } catch (error) {
      console.error(`Error refreshing Gmail token for user ${userId}:`, error);
      // Common errors: refresh token expired, revoked, or invalid
      return false;
    }
  }

  /**
   * Get Gmail user info
   */
  static async getGmailUserInfo(userId: number): Promise<{ email: string; name?: string } | null> {
    try {
      const tokens = await this.getUserTokens(userId);
      if (!tokens) {
        return null;
      }

      return {
        email: tokens.gmailEmail || '',
        name: tokens.gmailDisplayName
      };
    } catch (error) {
      console.error(`Error getting Gmail user info for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Store Firebase UID mapping for a user
   */
  static async storeFirebaseUidMapping(firebaseUid: string, userId: number): Promise<void> {
    try {
      console.log(`[TokenService] Storing Firebase UID mapping: ${firebaseUid} -> user ${userId}`);
      // Update the users table with the Firebase UID
      await storage.updateUser(userId, { firebaseUid });
      console.log(`[TokenService] Successfully stored Firebase UID mapping for user ${userId}`);
    } catch (error) {
      console.error(`Error storing Firebase UID mapping for user ${userId}:`, error);
      throw error;
    }
  }
}