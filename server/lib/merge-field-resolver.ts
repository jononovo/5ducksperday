/**
 * Server-side merge field resolver for email templates
 */

interface MergeContext {
  contact?: {
    name?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };
  company?: {
    name?: string;
    industry?: string;
    description?: string;
    website?: string;
    location?: string;
  };
  user?: {
    username?: string;
    email?: string;
  };
  senderNames?: {
    fullName?: string;
    firstName?: string;
  };
}

export function resolveAllMergeFields(content: string, context: MergeContext): string {
  let resolved = content;
  
  // Contact fields
  if (context.contact) {
    resolved = resolved.replace(/\{\{first_name\}\}/gi, context.contact.firstName || context.contact.name?.split(' ')[0] || '');
    resolved = resolved.replace(/\{\{last_name\}\}/gi, context.contact.lastName || context.contact.name?.split(' ').slice(1).join(' ') || '');
    resolved = resolved.replace(/\{\{contact_name\}\}/gi, context.contact.name || '');
    resolved = resolved.replace(/\{\{contact_email\}\}/gi, context.contact.email || '');
    resolved = resolved.replace(/\{\{contact_role\}\}/gi, context.contact.role || '');
  }
  
  // Company fields
  if (context.company) {
    resolved = resolved.replace(/\{\{company_name\}\}/gi, context.company.name || '');
    resolved = resolved.replace(/\{\{company_industry\}\}/gi, context.company.industry || '');
    resolved = resolved.replace(/\{\{company_description\}\}/gi, context.company.description || '');
    resolved = resolved.replace(/\{\{company_website\}\}/gi, context.company.website || '');
    resolved = resolved.replace(/\{\{company_location\}\}/gi, context.company.location || '');
  }
  
  // Sender fields
  if (context.senderNames) {
    resolved = resolved.replace(/\{\{sender_full_name\}\}/gi, context.senderNames.fullName || '');
    resolved = resolved.replace(/\{\{sender_first_name\}\}/gi, context.senderNames.firstName || '');
  }
  
  // User fields
  if (context.user) {
    resolved = resolved.replace(/\{\{user_name\}\}/gi, context.user.username || '');
    resolved = resolved.replace(/\{\{user_email\}\}/gi, context.user.email || '');
  }
  
  // Clean up any remaining unreplaced merge fields
  resolved = resolved.replace(/\{\{[^}]+\}\}/g, '');
  
  return resolved;
}