import type { Contact } from '@shared/schema';

/**
 * Unified email deduplication and merging logic
 * Prevents duplicate emails in both primary and alternative email fields
 */
export function mergeEmailData(existingContact: Contact, newEmail: string): Partial<Contact> {
  if (!newEmail || newEmail.length <= 5) return {};
  
  const normalizedNew = newEmail.toLowerCase().trim();
  const normalizedExisting = existingContact.email?.toLowerCase().trim();
  
  // If same as primary email, no changes needed
  if (normalizedExisting === normalizedNew) return {};
  
  const existingAlts = Array.isArray(existingContact.alternativeEmails) 
    ? existingContact.alternativeEmails.map(e => e.toLowerCase().trim())
    : [];
  
  // If already in alternatives, no changes needed
  if (existingAlts.includes(normalizedNew)) return {};
  
  // If no primary email exists, set as primary
  if (!existingContact.email) {
    return { email: newEmail };
  }
  
  // Add to alternatives with deduplication
  return {
    alternativeEmails: [...(existingContact.alternativeEmails || []), newEmail]
  };
}

/**
 * Check if a contact has completed email search (has a valid primary email)
 */
export function hasCompletedEmailSearch(contact: Contact): boolean {
  return !!(contact.email && contact.email.length > 5);
}

/**
 * Normalize email for comparison (lowercase, trimmed)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}