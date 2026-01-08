import { db } from "../../../db";
import { linkedinAccounts } from "@shared/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "../../../utils/encryption";
import { LinkedInLoginResult, LinkedInProfile, LinkedInSessionStatus } from "../types";

const LINKEDIN_SERVICE_URL = process.env.LINKEDIN_SERVICE_URL || "http://127.0.0.1:8001";
const LINKEDIN_INTERNAL_TOKEN = process.env.LINKEDIN_INTERNAL_TOKEN;

if (!LINKEDIN_INTERNAL_TOKEN) {
  console.warn("[LinkedIn] LINKEDIN_INTERNAL_TOKEN not set - LinkedIn integration will not work");
}

const userSessionMap = new Map<number, string>();

async function callLinkedInService<T>(endpoint: string, body: object, method: string = "POST"): Promise<T> {
  if (!LINKEDIN_INTERNAL_TOKEN) {
    throw new Error("LinkedIn service not configured - LINKEDIN_INTERNAL_TOKEN is required");
  }

  const response = await fetch(`${LINKEDIN_SERVICE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": LINKEDIN_INTERNAL_TOKEN,
    },
    body: method !== "GET" ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn service error: ${error}`);
  }

  return response.json();
}

export class LinkedInAuthService {
  static async connect(userId: number, email: string, password: string): Promise<LinkedInLoginResult> {
    const sessionId = `user_${userId}_${Date.now()}`;
    userSessionMap.set(userId, sessionId);

    try {
      const result = await callLinkedInService<{
        success: boolean;
        needs_verification: boolean;
        challenge_type?: string;
        profile?: {
          public_id: string;
          first_name: string;
          last_name: string;
          headline?: string;
          photo_url?: string;
        };
        cookies?: Record<string, string>;
        error?: string;
      }>("/login", {
        email,
        password,
        session_id: sessionId,
      });

      if (result.success && result.cookies && result.profile) {
        const encryptedCookies = encrypt(JSON.stringify(result.cookies));
        const cookieExpiry = new Date();
        cookieExpiry.setDate(cookieExpiry.getDate() + 60);

        const existingAccount = await db
          .select()
          .from(linkedinAccounts)
          .where(eq(linkedinAccounts.userId, userId))
          .limit(1);

        if (existingAccount.length > 0) {
          await db
            .update(linkedinAccounts)
            .set({
              linkedinPublicId: result.profile.public_id,
              linkedinName: `${result.profile.first_name} ${result.profile.last_name}`,
              linkedinHeadline: result.profile.headline,
              linkedinPhotoUrl: result.profile.photo_url,
              encryptedCookies,
              sessionStatus: "connected",
              cookieExpiresAt: cookieExpiry,
              connectedAt: new Date(),
              lastVerifiedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(linkedinAccounts.userId, userId));
        } else {
          await db.insert(linkedinAccounts).values({
            userId,
            linkedinPublicId: result.profile.public_id,
            linkedinName: `${result.profile.first_name} ${result.profile.last_name}`,
            linkedinHeadline: result.profile.headline,
            linkedinPhotoUrl: result.profile.photo_url,
            encryptedCookies,
            sessionStatus: "connected",
            cookieExpiresAt: cookieExpiry,
            connectedAt: new Date(),
            lastVerifiedAt: new Date(),
          });
        }

        return {
          success: true,
          needsVerification: false,
          profile: {
            publicId: result.profile.public_id,
            firstName: result.profile.first_name,
            lastName: result.profile.last_name,
            headline: result.profile.headline,
            photoUrl: result.profile.photo_url,
          },
        };
      }

      if (result.needs_verification) {
        const existingAccount = await db
          .select()
          .from(linkedinAccounts)
          .where(eq(linkedinAccounts.userId, userId))
          .limit(1);

        if (existingAccount.length > 0) {
          await db
            .update(linkedinAccounts)
            .set({
              sessionStatus: "pending_verification",
              updatedAt: new Date(),
            })
            .where(eq(linkedinAccounts.userId, userId));
        } else {
          await db.insert(linkedinAccounts).values({
            userId,
            sessionStatus: "pending_verification",
          });
        }

        return {
          success: false,
          needsVerification: true,
          challengeType: result.challenge_type as any,
        };
      }

      return {
        success: false,
        needsVerification: false,
        error: result.error || "Unknown error",
      };
    } catch (error) {
      console.error("LinkedIn connect error:", error);
      return {
        success: false,
        needsVerification: false,
        error: error instanceof Error ? error.message : "Connection failed",
      };
    }
  }

  static async verify(userId: number, pin: string): Promise<LinkedInLoginResult> {
    const sessionId = userSessionMap.get(userId);
    
    if (!sessionId) {
      return {
        success: false,
        needsVerification: false,
        error: "No pending login session. Please start the connection process again.",
      };
    }

    try {
      const result = await callLinkedInService<{
        success: boolean;
        profile?: {
          public_id: string;
          first_name: string;
          last_name: string;
          headline?: string;
          photo_url?: string;
        };
        cookies?: Record<string, string>;
        error?: string;
      }>("/verify", {
        session_id: sessionId,
        pin,
      });

      if (result.success && result.cookies && result.profile) {
        const encryptedCookies = encrypt(JSON.stringify(result.cookies));
        const cookieExpiry = new Date();
        cookieExpiry.setDate(cookieExpiry.getDate() + 60);

        await db
          .update(linkedinAccounts)
          .set({
            linkedinPublicId: result.profile.public_id,
            linkedinName: `${result.profile.first_name} ${result.profile.last_name}`,
            linkedinHeadline: result.profile.headline,
            linkedinPhotoUrl: result.profile.photo_url,
            encryptedCookies,
            sessionStatus: "connected",
            cookieExpiresAt: cookieExpiry,
            connectedAt: new Date(),
            lastVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(linkedinAccounts.userId, userId));

        return {
          success: true,
          needsVerification: false,
          profile: {
            publicId: result.profile.public_id,
            firstName: result.profile.first_name,
            lastName: result.profile.last_name,
            headline: result.profile.headline,
            photoUrl: result.profile.photo_url,
          },
        };
      }

      return {
        success: false,
        needsVerification: false,
        error: result.error || "Verification failed",
      };
    } catch (error) {
      console.error("LinkedIn verify error:", error);
      return {
        success: false,
        needsVerification: false,
        error: error instanceof Error ? error.message : "Verification failed",
      };
    }
  }

  static async setupTotp(userId: number, totpSecret: string): Promise<boolean> {
    try {
      const encryptedSecret = encrypt(totpSecret);

      await db
        .update(linkedinAccounts)
        .set({
          encryptedTotpSecret: encryptedSecret,
          updatedAt: new Date(),
        })
        .where(eq(linkedinAccounts.userId, userId));

      return true;
    } catch (error) {
      console.error("TOTP setup error:", error);
      return false;
    }
  }

  static async getStatus(userId: number): Promise<LinkedInSessionStatus> {
    try {
      const [account] = await db
        .select()
        .from(linkedinAccounts)
        .where(eq(linkedinAccounts.userId, userId))
        .limit(1);

      if (!account || account.sessionStatus === "disconnected") {
        return { connected: false };
      }

      const isExpired = account.cookieExpiresAt
        ? new Date() > account.cookieExpiresAt
        : false;

      if (isExpired) {
        await db
          .update(linkedinAccounts)
          .set({
            sessionStatus: "expired",
            updatedAt: new Date(),
          })
          .where(eq(linkedinAccounts.userId, userId));

        return { connected: false };
      }

      return {
        connected: account.sessionStatus === "connected",
        profile: account.linkedinPublicId
          ? {
              publicId: account.linkedinPublicId,
              firstName: account.linkedinName?.split(" ")[0] || "",
              lastName: account.linkedinName?.split(" ").slice(1).join(" ") || "",
              headline: account.linkedinHeadline || undefined,
              photoUrl: account.linkedinPhotoUrl || undefined,
            }
          : undefined,
        expiresAt: account.cookieExpiresAt || undefined,
        lastVerified: account.lastVerifiedAt || undefined,
      };
    } catch (error) {
      console.error("Get status error:", error);
      return { connected: false };
    }
  }

  static async checkSession(userId: number): Promise<boolean> {
    try {
      const [account] = await db
        .select()
        .from(linkedinAccounts)
        .where(eq(linkedinAccounts.userId, userId))
        .limit(1);

      if (!account || !account.encryptedCookies) {
        return false;
      }

      const cookies = JSON.parse(decrypt(account.encryptedCookies));
      const sessionId = `user_${userId}_check_${Date.now()}`;

      const result = await callLinkedInService<{
        valid: boolean;
        error?: string;
      }>("/session/check", {
        session_id: sessionId,
        cookies,
      });

      if (result.valid) {
        await db
          .update(linkedinAccounts)
          .set({
            lastVerifiedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(linkedinAccounts.userId, userId));
      } else {
        await db
          .update(linkedinAccounts)
          .set({
            sessionStatus: "expired",
            updatedAt: new Date(),
          })
          .where(eq(linkedinAccounts.userId, userId));
      }

      return result.valid;
    } catch (error) {
      console.error("Check session error:", error);
      return false;
    }
  }

  static async disconnect(userId: number): Promise<boolean> {
    try {
      const sessionId = `user_${userId}_${Date.now()}`;

      await callLinkedInService("/logout", { session_id: sessionId });

      await db
        .update(linkedinAccounts)
        .set({
          encryptedCookies: null,
          encryptedTotpSecret: null,
          sessionStatus: "disconnected",
          updatedAt: new Date(),
        })
        .where(eq(linkedinAccounts.userId, userId));

      return true;
    } catch (error) {
      console.error("Disconnect error:", error);
      return false;
    }
  }

  static async getCookiesForUser(userId: number): Promise<Record<string, string> | null> {
    try {
      const [account] = await db
        .select()
        .from(linkedinAccounts)
        .where(eq(linkedinAccounts.userId, userId))
        .limit(1);

      if (!account || !account.encryptedCookies || account.sessionStatus !== "connected") {
        return null;
      }

      return JSON.parse(decrypt(account.encryptedCookies));
    } catch (error) {
      console.error("Get cookies error:", error);
      return null;
    }
  }
}
