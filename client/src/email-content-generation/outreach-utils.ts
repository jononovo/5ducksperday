import type { Contact, Company } from "@shared/schema";
import type { MergeFieldContext } from "@/lib/merge-field-resolver";

/**
 * Email Generation Utilities
 * Pure functions for email generation logic
 */

export function createMergeFieldContext(
  contact: Contact | null,
  company: Company | null,
  senderFullName?: string,
  senderFirstName?: string
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
      name: senderFullName || 'User',
      firstName: senderFirstName || senderFullName?.split(' ')[0] || 'User'
    }
  };
}

/**
 * Resolve sender names on the frontend using available user data
 * Priority: username > email prefix
 */
export function resolveFrontendSenderNames(user: any): { firstName: string; fullName: string } {
  if (!user) {
    return { firstName: 'User', fullName: 'User' };
  }

  // Use username if it's not just the email prefix
  const emailPrefix = user.email?.split('@')[0] || '';
  if (user.username && user.username !== emailPrefix && user.username.trim() !== '') {
    const fullName = user.username.trim();
    const firstName = fullName.split(' ')[0] || fullName;
    return { firstName, fullName };
  }

  // Fallback to email prefix
  return { firstName: emailPrefix, fullName: emailPrefix };
}

export function shouldAutoFillSubject(currentSubject: string): boolean {
  return !currentSubject || currentSubject.trim() === '';
}

export function shouldAutoFillEmail(contact: Contact | null, currentToEmail: string): boolean {
  return !!(contact?.email && (!currentToEmail || currentToEmail.trim() === ''));
}

export function formatGeneratedContent(newContent: string, existingContent: string): string {
  return newContent; // Always replace content instead of appending
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