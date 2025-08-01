import type { Contact, Company } from "@shared/schema";
import type { MergeFieldContext } from "@/lib/merge-field-resolver";

/**
 * Email Generation Utilities
 * Pure functions for email generation logic
 */

export function createMergeFieldContext(
  contact: Contact | null,
  company: Company | null,
  senderName?: string
): MergeFieldContext {
  return {
    contact: contact ? {
      name: contact.name,
      role: contact.role || undefined,
      email: contact.email || undefined,
    } : null,
    company: company ? {
      name: company.name,
    } : null,
    sender: {
      name: senderName || 'Your Name'
    }
  };
}

export function shouldAutoFillSubject(currentSubject: string): boolean {
  return !currentSubject || currentSubject.trim() === '';
}

export function shouldAutoFillEmail(contact: Contact | null, currentToEmail: string): boolean {
  return !!(contact?.email && (!currentToEmail || currentToEmail.trim() === ''));
}

export function formatGeneratedContent(newContent: string, existingContent: string): string {
  return existingContent 
    ? `${newContent}\n\n${existingContent}`
    : newContent;
}

export function validateEmailGenerationRequest(
  emailPrompt: string,
  company: Company | null
): { isValid: boolean; error?: string } {
  if (!company) {
    return { isValid: false, error: "No Company Selected" };
  }

  if (!emailPrompt || emailPrompt.trim() === '') {
    return { isValid: false, error: "No Prompt Provided" };
  }

  return { isValid: true };
}