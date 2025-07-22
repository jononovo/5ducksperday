export interface UserTokens {
  firebaseIdToken: string;
  gmailAccessToken: string;
  gmailRefreshToken?: string;
  tokenExpiry: number;
  scopes: string[];
  createdAt: number;
  updatedAt: number;
  gmailEmail?: string;
  gmailName?: string;
  givenName?: string;        // From userinfo.profile
  familyName?: string;       // From userinfo.profile
  profilePicture?: string;   // From userinfo.profile
  verifiedEmail?: boolean;   // From userinfo.email
}

export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  remainingTime?: number;
}