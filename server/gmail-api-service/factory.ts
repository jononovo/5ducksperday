import { TokenService } from "../features/billing/tokens/service";
import type { EmailProvider } from "./types";
import { MockEmailProvider } from "./providers/mock.provider";
import { GmailProvider } from "./providers/gmail.provider";

export function getEmailProvider(userId: number, accessToken?: string): EmailProvider {
  if (accessToken) {
    console.log(`Using Gmail provider for user ${userId}`);
    return new GmailProvider(accessToken, userId);
  } else {
    console.log(`Using mock email provider for user ${userId} (no Gmail token available)`);
    return new MockEmailProvider();
  }
}