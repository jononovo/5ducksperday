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
  
  // Length check
  if (name.length > 2) score += 10;
  if (name.length > 5) score += 10;
  
  // Has first and last name
  if (firstName && lastName) score += 30;
  
  // Has proper casing (Title Case)
  if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)+$/.test(name)) score += 15;
  
  // Has name prefix
  if (prefix) score += 5;
  
  // Has name suffix
  if (suffix) score += 5;
  
  // Penalize all-caps
  if (name === name.toUpperCase() && name.length > 2) score -= 10;
  
  // Penalize generic or company names
  const lowerName = name.toLowerCase();
  if (
    lowerName.includes('admin') ||
    lowerName.includes('info') ||
    lowerName.includes('sales') ||
    lowerName.includes('support') ||
    lowerName.includes('contact') ||
    lowerName.includes('service') ||
    lowerName.includes('manager') ||
    lowerName.includes('company') ||
    lowerName.includes('business') ||
    lowerName.includes('team')
  ) {
    score -= 30;
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Determines if a name is likely a company name rather than a person
 */
export function isLikelyCompanyName(name: string): boolean {
  const lowerName = name.toLowerCase();
  
  const companyIdentifiers = [
    'inc', 'corp', 'llc', 'ltd', 'co', 'company', 'corporation', 
    'incorporated', 'limited', 'group', 'holdings', 'enterprises',
    'services', 'solutions', 'systems', 'technologies', 'international'
  ];
  
  // Check for common company word patterns
  for (const identifier of companyIdentifiers) {
    if (lowerName.includes(identifier)) {
      return true;
    }
  }
  
  // Check for "&" which is common in company names
  if (name.includes('&')) {
    return true;
  }
  
  // Check for all caps (common in company names/acronyms)
  if (name === name.toUpperCase() && name.length > 2) {
    return true;
  }
  
  return false;
}

/**
 * Determines if a name is likely a department or role rather than a person
 */
export function isLikelyDepartmentOrRole(name: string): boolean {
  const lowerName = name.toLowerCase();
  
  const roleIdentifiers = [
    'department', 'dept', 'team', 'division', 'office',
    'sales', 'marketing', 'support', 'customer', 'service',
    'manager', 'director', 'head of', 'chief', 'officer',
    'ceo', 'cto', 'cfo', 'coo', 'president'
  ];
  
  // Check for common department/role word patterns
  for (const identifier of roleIdentifiers) {
    if (lowerName.includes(identifier)) {
      return true;
    }
  }
  
  return false;
}