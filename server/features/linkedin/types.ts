import { LinkedinAccount, LinkedinAction, LinkedinEngagement } from "@shared/schema";

export interface LinkedInProfile {
  publicId: string;
  firstName: string;
  lastName: string;
  headline?: string;
  photoUrl?: string;
}

export interface LinkedInLoginResult {
  success: boolean;
  needsVerification: boolean;
  challengeType?: 'pin' | 'email' | 'sms' | 'totp';
  profile?: LinkedInProfile;
  cookies?: Record<string, string>;
  error?: string;
}

export interface LinkedInSessionStatus {
  connected: boolean;
  profile?: LinkedInProfile;
  expiresAt?: Date;
  lastVerified?: Date;
}

export interface LinkedInConnectRequest {
  email: string;
  password: string;
}

export interface LinkedInVerifyRequest {
  pin: string;
}

export interface LinkedInTotpSetupRequest {
  totpSecret: string;
}

export type LinkedInAccountWithStatus = LinkedinAccount & {
  isExpired: boolean;
  isConnected: boolean;
};
