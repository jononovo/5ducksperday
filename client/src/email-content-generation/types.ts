import type { Contact, Company } from "@shared/schema";

export interface EmailGenerationPayload {
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

export interface EmailGenerationState {
  isGenerating: boolean;
  error: Error | null;
}