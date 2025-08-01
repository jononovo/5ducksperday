import type { Contact, Company } from "@shared/schema";

export interface EmailGenerationRequest {
  emailPrompt: string;
  contact: Contact | null;
  company: Company;
  toEmail?: string;
  emailSubject?: string;
}

export interface EmailGenerationResponse {
  subject: string;
  content: string;
}

export interface EmailGenerationContext {
  contact: Contact | null;
  company: Company;
  userPrompt: string;
}