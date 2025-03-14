/**
 * Enhanced name parsing module
 * Provides improved parsing and validation for contact names
 */

export interface NameParts {
  firstName: string;
  lastName: string;
  middleName?: string;
  prefix?: string;
  suffix?: string;
  fullName: string;
}

// Common name prefixes and suffixes
const NAME_PREFIXES = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'rev', 'hon'];
const NAME_SUFFIXES = ['jr', 'sr', 'i', 'ii', 'iii', 'iv', 'v', 'phd', 'md', 'dds', 'esq'];

/**
 * Enhanced name parsing that handles more complex name formats
 */
export function parseFullName(fullName: string): NameParts {
  if (!fullName) {
    return { firstName: '', lastName: '', fullName: '' };
  }

  // Clean up the input
  const cleanName = fullName
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[.,]/g, ' ') // Replace commas and periods with spaces
    .replace(/\s+/g, ' '); // Normalize whitespace again

  // Initialize result
  const result: NameParts = {
    firstName: '',
    lastName: '',
    fullName: cleanName
  };

  // Split name into parts
  const parts = cleanName.split(' ');
  if (parts.length === 0) {
    return result;
  }

  // Check for single word name
  if (parts.length === 1) {
    result.firstName = parts[0];
    return result;
  }

  // Handle prefix
  let startIndex = 0;
  if (NAME_PREFIXES.includes(parts[0].toLowerCase().replace('.', ''))) {
    result.prefix = parts[0];
    startIndex = 1;
  }

  // Handle suffix
  let endIndex = parts.length;
  const lastPart = parts[parts.length - 1].toLowerCase().replace('.', '');
  if (NAME_SUFFIXES.includes(lastPart)) {
    result.suffix = parts[parts.length - 1];
    endIndex = parts.length - 1;
  }

  // Extract remaining parts
  const nameParts = parts.slice(startIndex, endIndex);
  if (nameParts.length === 0) {
    return result;
  }

  // Handle two-part name
  if (nameParts.length === 2) {
    result.firstName = nameParts[0];
    result.lastName = nameParts[1];
    return result;
  }

  // Handle multi-part name
  result.firstName = nameParts[0];
  // Middle name(s)
  if (nameParts.length > 2) {
    result.middleName = nameParts.slice(1, nameParts.length - 1).join(' ');
  }
  result.lastName = nameParts[nameParts.length - 1];

  return result;
}

/**
 * Validates if a name looks like a real person name
 * Returns a score from 0-100
 */
export function validatePersonName(name: string): number {
  if (!name) return 0;
  
  // Parse the name
  const { firstName, lastName, prefix, suffix } = parseFullName(name);
  
  // Basic checks
  let score = 0;
  
  // CRITICAL CHECK: Must have both first and last name
  if (!firstName || !lastName) {
    return 0; // Immediate failure if not a full name
  }
  
  // Names must be reasonable length (not just initials or single chars)
  if (firstName.length < 2 || lastName.length < 2) {
    return 5; // Very low score for initials or ultra-short names
  }
  
  // Add points for reasonable name length
  if (name.length > 5) score += 15;
  
  // More points for proper full name format
  if (firstName && lastName) score += 40;
  
  // Has proper casing (Title Case) - strong indicator of a real name
  if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(name)) score += 20;
  
  // Has name prefix (Mr. Mrs. Dr. etc.)
  if (prefix) score += 5;
  
  // Has name suffix (Jr. Sr. III, etc.)
  if (suffix) score += 5;
  
  // Penalize all-caps (likely not a person name)
  if (name === name.toUpperCase() && name.length > 2) score -= 25;
  
  // STRICT FILTERING: Check against common words that are mistaken for names
  const lowerName = name.toLowerCase();
  const lowerFirst = firstName.toLowerCase();
  const lowerLast = lastName.toLowerCase();
  
  // Lists of words that should never be person names
  const disallowedWords = [
    // Generic business terms
    'admin', 'info', 'sales', 'support', 'contact', 'service', 'manager', 
    'company', 'business', 'team', 'department', 'staff', 'employee',
    'office', 'reception', 'inquiry', 'customer', 'help', 'assistance',
    // Website/online terms
    'website', 'online', 'email', 'site', 'web', 'page', 'click', 'login',
    'account', 'password', 'username', 'user', 'member', 
    // Generic services
    'consultation', 'appointment', 'booking', 'reservation', 'question', 
    'delivery', 'shipping', 'order', 'product', 'service', 'solution',
    // Locations/positions
    'location', 'address', 'street', 'avenue', 'building', 'floor',
    // Generic descriptors
    'new', 'old', 'good', 'great', 'best', 'better', 'top', 'main',
    'important', 'key', 'primary', 'secondary', 'first', 'last',
    // Business concepts
    'mission', 'vision', 'value', 'quality', 'experience', 'expert',
    'professional', 'industry', 'market', 'section', 'about', 'home'
  ];
  
  // Check if ANY part of the name contains disallowed words
  // This catches "John Sales" or "Marketing Smith" type false positives
  for (const word of disallowedWords) {
    if (lowerFirst === word || lowerLast === word) {
      return 0; // Zero score if exact match to disallowed word
    }
    
    if (lowerName.includes(` ${word} `) || 
        lowerName.startsWith(`${word} `) || 
        lowerName.endsWith(` ${word}`)) {
      score -= 50; // Heavy penalty for containing a disallowed word
    }
  }
  
  // Grammatical checks - real names don't contain certain characters
  if (name.includes('/') || name.includes('\\') || 
      name.includes(':') || name.includes('|') ||
      name.includes('-') || name.includes('_') ||
      name.includes('.') || name.includes('@')) {
    score -= 30;
  }
  
  // Additional check: Names with too many words are suspicious
  const wordCount = name.split(' ').filter(w => w.length > 0).length;
  if (wordCount > 4) {
    score -= 20; // Penalty for too many name parts
  }
  
  // Small boost for names with 2-3 words (most common pattern)
  if (wordCount >= 2 && wordCount <= 3) {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Determines if a name is likely a company name rather than a person
 */
export function isLikelyCompanyName(name: string): boolean {
  if (!name) return false;
  const lowerName = name.toLowerCase().trim();
  
  const companyIdentifiers = [
    // Corporate identifiers
    'inc', 'corp', 'llc', 'ltd', 'co', 'company', 'corporation', 
    'incorporated', 'limited', 'group', 'holdings', 'enterprises',
    'services', 'solutions', 'systems', 'technologies', 'international',
    'partners', 'associates', 'consulting', 'consultants', 'advisors',
    // Business types
    'agency', 'firm', 'studio', 'institute', 'center', 'foundation',
    'organization', 'association', 'society',
    // Geographic indicators when not following a person name
    'global', 'local', 'national', 'regional', 'international', 'worldwide',
    'us', 'america', 'american', 'european', 'asia',
    // Business fields
    'tech', 'legal', 'dental', 'medical', 'healthcare', 'financial',
    'investment', 'media', 'creative', 'digital', 'software',
    // Industry-specific
    'restaurant', 'cafe', 'bakery', 'shop', 'store', 'market', 'mart',
    'salon', 'spa', 'clinic', 'hospital', 'school', 'academy',
    'construction', 'builders', 'realty', 'properties', 'homes',
    // Product identifiers
    'products', 'goods', 'equipment', 'supplies', 'tools',
    // Online indicators
    'online', 'web', 'internet', 'site', 'blog'
  ];
  
  // Check for common company word patterns
  for (const identifier of companyIdentifiers) {
    // Check for exact word match (with word boundaries)
    const regex = new RegExp(`\\b${identifier}\\b`, 'i');
    if (regex.test(lowerName)) {
      return true;
    }
  }
  
  // Check for special characters common in company names but not people names
  if (name.includes('&') || 
      name.includes('/') || 
      name.includes('|') ||
      name.includes(':') ||
      name.includes('®') ||
      name.includes('™')) {
    return true;
  }
  
  // Check for all caps (common in company names/acronyms)
  if (name === name.toUpperCase() && name.length > 2) {
    return true;
  }
  
  // Check for "The" at the beginning (companies often start with "The")
  if (lowerName.startsWith('the ')) {
    return true;
  }
  
  // Check for common endings that indicate companies
  const companyEndings = [' group', ' inc', ' llc', ' ltd', ' co'];
  for (const ending of companyEndings) {
    if (lowerName.endsWith(ending)) {
      return true;
    }
  }
  
  // Check for company patterns like "X of Y" or "X & Y" where X and Y are not people
  if ((lowerName.includes(' of ') || lowerName.includes(' & ')) && 
      !lowerName.match(/^[a-z]+ [a-z]+( (of|&) [a-z]+ [a-z]+)?$/i)) {
    // This pattern catches "Bank of America" but not "John Smith of Chicago"
    return true;
  }
  
  return false;
}

/**
 * Determines if a name is likely a department or role rather than a person
 */
export function isLikelyDepartmentOrRole(name: string): boolean {
  if (!name) return false;
  const lowerName = name.toLowerCase().trim();
  
  const roleIdentifiers = [
    // Departments
    'department', 'dept', 'team', 'division', 'office', 'unit',
    'group', 'committee', 'taskforce', 'board', 'council',
    
    // Business functions
    'sales', 'marketing', 'support', 'customer', 'service',
    'operations', 'hr', 'human resources', 'finance', 'accounting',
    'it', 'information technology', 'r&d', 'research', 'development',
    'legal', 'compliance', 'quality', 'production', 'manufacturing',
    'engineering', 'design', 'product', 'project', 'program',
    
    // Leadership titles
    'manager', 'director', 'head of', 'chief', 'officer',
    'ceo', 'cto', 'cfo', 'coo', 'president', 'vp', 'vice president',
    'founder', 'owner', 'partner', 'executive', 'administrator',
    'coordinator', 'supervisor', 'lead', 'senior', 'junior',
    'associate', 'assistant', 'specialist', 'analyst', 'consultant',
    
    // Descriptive terms
    'staff', 'personnel', 'employee', 'workers', 'members',
    'leadership', 'management', 'administration', 'executives',
    
    // Contact channels
    'inquiries', 'questions', 'contact', 'help', 'helpdesk', 'desk',
    'inbox', 'general', 'info', 'information', 'mail'
  ];
  
  // Check for common department/role word patterns
  for (const identifier of roleIdentifiers) {
    // Check for exact word match with word boundaries
    const regex = new RegExp(`\\b${identifier}\\b`, 'i');
    if (regex.test(lowerName)) {
      return true;
    }
  }
  
  // Common patterns that indicate roles rather than people
  const rolePatterns = [
    /^[a-z]+ (department|dept|team|division|manager|director|specialist)$/i,
    /^(department|dept|team|division) of [a-z]+$/i,
    /^(chief|head|director|vp|manager) of [a-z]+$/i,
    /^[a-z]+ (officer|specialist|coordinator|administrator|supervisor)$/i,
    /^(senior|junior|lead|principal) [a-z]+$/i
  ];
  
  for (const pattern of rolePatterns) {
    if (pattern.test(name)) {
      return true;
    }
  }
  
  return false;
}