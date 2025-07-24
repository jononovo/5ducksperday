export interface UserTokens {
  gmailAccessToken: string;
  gmailRefreshToken?: string;
  tokenExpiry: number;
  scopes: string[];
  createdAt: number;
  updatedAt: number;
  gmailEmail?: string;
  gmailName?: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  remainingTime?: number;
}