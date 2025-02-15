import type { Contact } from "@shared/schema";
import { validateNameLocally, type ValidationOptions, combineValidationScores } from "../nameValidation";

export function isPlaceholderEmail(email: string): boolean {
  const placeholderPatterns = [
    /first[._]?name/i,
    /last[._]?name/i,
    /first[._]?initial/i,
    /company(domain)?\.com$/i,
    /example\.com$/i,
    /domain\.com$/i,
    /test[._]?user/i,
    /demo[._]?user/i,
    /noreply/i,
    /donotreply/i
  ];
  return placeholderPatterns.some(pattern => pattern.test(email));
}

export function isValidBusinessEmail(email: string): boolean {
  const businessPatterns = [
    /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/,  // Basic email format
    /^(?!support|info|sales|contact|help|admin|webmaster|postmaster).*@/i,  // Not generic addresses
    /^[a-z]{1,3}[._][a-z]+@/i,  // Initials pattern (e.g., j.smith@)
    /^[a-z]+\.[a-z]+@/i,  // firstname.lastname pattern
  ];
  return businessPatterns.some(pattern => pattern.test(email));
}

export function parseContactDetails(response: string): Partial<Contact> {
  const contact: Partial<Contact> = {};

  const emailMatch = response.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch && !isPlaceholderEmail(emailMatch[0])) {
    contact.email = emailMatch[0];
  }

  const linkedinMatch = response.match(/linkedin\.com\/in\/[\w-]+/);
  if (linkedinMatch) {
    contact.linkedinUrl = `https://www.${linkedinMatch[0]}`;
  }

  const roleMatch = response.match(/(?:role|position|title):\s*([^.\n]+)/i);
  if (roleMatch) {
    contact.role = roleMatch[1].trim();
  }

  const locationMatch = response.match(/(?:location|based in|located in):\s*([^.\n]+)/i);
  if (locationMatch) {
    contact.location = locationMatch[1].trim();
  }

  return contact;
}
