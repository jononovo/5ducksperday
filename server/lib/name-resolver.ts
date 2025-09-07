import { TokenService } from '../features/billing/tokens/service';
import { storage } from '../storage';

export interface SenderNames {
  firstName: string;
  fullName: string;
}

/**
 * Resolves sender names using priority: Gmail displayName > Database username > Email prefix
 * @param userId - The user ID to resolve names for
 * @returns Promise containing firstName and fullName
 */
export async function resolveSenderNames(userId: number): Promise<SenderNames> {
  try {
    // Priority 1: Try Gmail display name from tokens
    const gmailInfo = await TokenService.getGmailUserInfo(userId);
    if (gmailInfo.displayName && gmailInfo.displayName.trim() !== '') {
      const fullName = gmailInfo.displayName.trim();
      const firstName = fullName.split(' ')[0] || fullName;
      
      console.log(`[NameResolver] Using Gmail displayName for user ${userId}:`, {
        fullName,
        firstName,
        source: 'gmail'
      });
      
      return { firstName, fullName };
    }

    // Priority 2: Try database username
    const user = await storage.getUserById(userId);
    if (user?.username && user.username.trim() !== '' && user.username !== user.email?.split('@')[0]) {
      const fullName = user.username.trim();
      const firstName = fullName.split(' ')[0] || fullName;
      
      console.log(`[NameResolver] Using database username for user ${userId}:`, {
        fullName,
        firstName,
        source: 'database'
      });
      
      return { firstName, fullName };
    }

    // Priority 3: Fallback to email prefix
    if (user?.email) {
      const fullName = user.email.split('@')[0];
      const firstName = fullName;
      
      console.log(`[NameResolver] Using email prefix for user ${userId}:`, {
        fullName,
        firstName,
        source: 'email_fallback'
      });
      
      return { firstName, fullName };
    }

    // Last resort fallback
    console.warn(`[NameResolver] No name sources available for user ${userId}, using fallback`);
    return { firstName: 'User', fullName: 'User' };
    
  } catch (error) {
    console.error(`[NameResolver] Error resolving names for user ${userId}:`, error);
    return { firstName: 'User', fullName: 'User' };
  }
}

/**
 * Simple utility to extract first name from a full name string
 * @param fullName - The full name to extract from
 * @returns The first name or the full name if only one word
 */
export function extractFirstName(fullName: string): string {
  if (!fullName || fullName.trim() === '') {
    return 'User';
  }
  
  const trimmed = fullName.trim();
  const firstPart = trimmed.split(' ')[0];
  return firstPart || trimmed;
}