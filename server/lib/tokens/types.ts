export interface UserTokens {
  gmailAccessToken: string;
  gmailRefreshToken?: string;
  tokenExpiry: number;
  scopes: string[];
  createdAt: number;
  updatedAt: number;
  gmailEmail?: string;
  // gmailName removed - user will provide via modal/dialog
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  remainingTime?: number;
}