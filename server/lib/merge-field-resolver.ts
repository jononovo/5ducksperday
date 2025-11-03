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
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
  senderNames?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
}

/**
 * Default fallback values for missing data
 */
const DEFAULT_VALUES: Record<string, string> = {
  first_name: 'there',
  last_name: '',
  email: '',
  contact_company_name: 'your company',
  sender_first_name: 'The Team',
  sender_last_name: '',
  sender_company_name: '',
  sender_email: '',
  title: '',
};

export function resolveAllMergeFields(content: string, context: MergeContext): string {
  let resolved = content;
  
  // Contact/Recipient fields
  if (context.contact) {
    // Standard recipient fields
    resolved = resolved.replace(/\{\{first_name\}\}/gi, 
      context.contact.firstName || context.contact.name?.split(' ')[0] || DEFAULT_VALUES.first_name);
    resolved = resolved.replace(/\{\{last_name\}\}/gi, 
      context.contact.lastName || context.contact.name?.split(' ').slice(1).join(' ') || DEFAULT_VALUES.last_name);
    resolved = resolved.replace(/\{\{contact_name\}\}/gi, context.contact.name || '');
    resolved = resolved.replace(/\{\{contact_email\}\}/gi, context.contact.email || '');
    resolved = resolved.replace(/\{\{email\}\}/gi, context.contact.email || DEFAULT_VALUES.email);
    resolved = resolved.replace(/\{\{contact_role\}\}/gi, context.contact.role || '');
    resolved = resolved.replace(/\{\{title\}\}/gi, context.contact.role || DEFAULT_VALUES.title);
  }
  
  // Company fields for recipient's company
  if (context.company) {
    resolved = resolved.replace(/\{\{contact_company_name\}\}/gi, 
      context.company.name || DEFAULT_VALUES.contact_company_name);
    resolved = resolved.replace(/\{\{company_name\}\}/gi, context.company.name || '');
    // We're not including website and industry as requested
  }
  
  // Sender fields - prioritize senderNames, fallback to user
  const senderFirstName = context.senderNames?.firstName || 
                          context.user?.firstName || 
                          context.user?.username?.split(' ')[0] || 
                          DEFAULT_VALUES.sender_first_name;
  const senderLastName = context.senderNames?.lastName || 
                         context.user?.lastName || 
                         context.user?.username?.split(' ').slice(1).join(' ') || 
                         DEFAULT_VALUES.sender_last_name;
  const senderCompanyName = context.senderNames?.companyName || 
                            context.user?.companyName || 
                            DEFAULT_VALUES.sender_company_name;
  const senderEmail = context.user?.email || DEFAULT_VALUES.sender_email;
  
  resolved = resolved.replace(/\{\{sender_first_name\}\}/gi, senderFirstName);
  resolved = resolved.replace(/\{\{sender_last_name\}\}/gi, senderLastName);
  resolved = resolved.replace(/\{\{sender_full_name\}\}/gi, 
    context.senderNames?.fullName || `${senderFirstName} ${senderLastName}`.trim());
  resolved = resolved.replace(/\{\{sender_company_name\}\}/gi, senderCompanyName);
  resolved = resolved.replace(/\{\{sender_email\}\}/gi, senderEmail);
  
  // User fields (legacy support)
  if (context.user) {
    resolved = resolved.replace(/\{\{user_name\}\}/gi, context.user.username || '');
    resolved = resolved.replace(/\{\{user_email\}\}/gi, context.user.email || '');
  }
  
  // Clean up any remaining unreplaced merge fields - but log them first
  const remainingFields = resolved.match(/\{\{[^}]+\}\}/g);
  if (remainingFields) {
    console.warn('[MergeFieldResolver] Unresolved merge fields:', remainingFields);
  }
  resolved = resolved.replace(/\{\{[^}]+\}\}/g, '');
  
  return resolved;
}

/**
 * Helper to build context from database records
 */
export function buildMergeContext(
  recipient: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    company?: string | null;
    title?: string | null;
  },
  sender: {
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    company?: string | null;
  },
  company?: {
    name?: string | null;
  }
): MergeContext {
  return {
    contact: {
      email: recipient.email,
      firstName: recipient.firstName || undefined,
      lastName: recipient.lastName || undefined,
      name: recipient.name || `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || undefined,
      role: recipient.title || undefined
    },
    company: company ? {
      name: company.name || recipient.company || undefined
    } : {
      name: recipient.company || undefined  
    },
    user: {
      email: sender.email,
      firstName: sender.firstName || undefined,
      lastName: sender.lastName || undefined,
      username: sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || undefined,
      companyName: sender.company || undefined
    },
    senderNames: {
      firstName: sender.firstName || undefined,
      lastName: sender.lastName || undefined,
      fullName: sender.name || `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || undefined,
      companyName: sender.company || undefined
    }
  };
}