import type { Contact, Company } from "@shared/schema";
import type { SenderNames } from "../lib/name-resolver";

export interface EmailGenerationRequest {
  emailPrompt: string;
  contact: Contact | null;
  company: Company;
  userId: number;
  toEmail?: string;
  emailSubject?: string;
  tone?: string;
  offerStrategy?: string;
  generateTemplate?: boolean; // Flag to generate template with merge fields
}

export interface EmailGenerationResponse {
  subject: string;
  content: string;
}

export interface EmailGenerationContext {
  contact: Contact | null;
  company: Company;
  userPrompt: string;
  senderNames?: SenderNames;
  generateTemplate?: boolean;
}