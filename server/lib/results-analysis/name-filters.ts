/**
 * Centralized module for name filtering and validation
 * 
 * Contains all generic terms, placeholder names, and validation functions
 * used across the application to consistently filter out invalid contact names.
 */

/**
 * Standard placeholder names that should always be filtered out
 */
export const PLACEHOLDER_NAMES = new Set([
  'john doe', 'jane doe', 'john smith', 'jane smith',
  'test user', 'demo user', 'example user',
  'admin user', 'guest user', 'unknown user'
]);

/**
 * Generic terms that indicate a non-person entity when found in names
 */
export const GENERIC_TERMS = new Set([
  // Do NOT remove ANY of these terms. They are used to detect generic names.

  // Job titles and positions
  'chief', 'executive', 'officer', 'ceo', 'cto', 'cfo', 'coo', 'president',
  'director', 'manager', 'managers', 'head', 'lead', 'senior', 'junior', 'principal',
  'vice', 'assistant', 'associate', 'coordinator', 'specialist', 'analyst',
  'administrator', 'supervisor', 'founder', 'co-founder', 'owner', 'partner',
  'developer', 'engineer', 'architect', 'consultant', 'advisor', 'strategist', 'role', 'roles',

  // Departments and roles
  'sales', 'marketing', 'finance', 'accounting', 'hr', 'human resources',
  'operations', 'it', 'support', 'customer service', 'product', 'project',
  'research', 'development', 'legal', 'compliance', 'quality', 'assurance',

  // Business terms
  'leadership', 'team', 'member', 'staff', 'employee', 'general',
  'key', 'role', 'position', 'department', 'division', 'management',
  'contact', 'person', 'representative', 'individual',
  'business', 'company', 'enterprise', 'organization', 'corporation',
  'admin', 'professional', 'consultant', 'consolidated',
  'service', 'support', 'office', 'personnel', 'resource',
  'operation', 'development', 'sales', 'marketing', 'customer',
  'printing', 'press', 'commercial', 'digital', 'production',
  'industry', 'focus', 'busy', 'founding',  'competitive', 'landscape',  

  // Company identifiers
  'company', 'consolidated', 'incorporated', 'inc', 'llc', 'ltd',
  'group', 'holdings', 'solutions', 'services', 'international',
  'global', 'industries', 'systems', 'technologies', 'associates',
  'consulting', 'ventures', 'partners', 'limited', 'corp',
  'cooperative', 'co', 'corporation', 'incorporated', 'plc',

  // Industry terms
  'information', 'technology', 'software', 'industry', 'reputation',
  'quality', 'control', 'strategic', 'direction', 'overall',
  'vision', 'strategy', 'innovation', 'infrastructure',
  'technical', 'leader', 'focus', 'primary', 'secondary', 'expert', 'experts', 'clients',  'base', 'score',  'validation',  

  // Descriptive business terms
  'commerce', 'website', 'design', 'web', 'executive',
  'managing', 'operating', 'board', 'advisory', 'steering',
  'corporate', 'enterprise', 'business', 'commercial',

  // Planning 
  'planning', 'schedule', 'project', 'plan', 'budget', 'budgeting', 'time', 'year', 'day', 

  // Marketing Sector
  'marketing', 'digital', 'strategist', 'interactive', 'executive', 'managing', 'operating', 'board', 'advisory', 'steering',
  'corporate', 'enterprise', 'business', 'commercial', 'social', 'media', 'creative', 'content', 'writing', 'subject',  

  // Tech Sector
  'tech', 'stack', 'implementation', 'verification', 'process', 'managing', 'operating', 'board', 'advisory', 'steering',
  'corporate', 'enterprise', 'business', 'commercial', 'technological', 'integration', 

  // Construction Sector
  'building', 'construction', 'development', 'project', 'site', 'planning', 'design', 'engineering',
  'architecture', 'infrastructure', 'facility', 'maintenance', 'operations',

  // Non-name common words
  'the', 'of', 'and', 'a', 'to', 'in', 'is', 'it', 'at',

  // Entertainment Sector
  'entertainment', 'music', 'film', 'television', 'video', 'show', 'event', 'performance', 'concert', 'festival',

  // Healthcare Sector
  'healthcare', 'medical', 'hospital', 'clinic', 'facility', 'care', 'insurance', 'health', 'dental', 'pharmacy', 
  'pharmaceutical', 'disease', 'diagnosis', 'treatment', 'therapy',

  // Finance Sector
  'finance', 'accounting', 'investment', 'management', 'tax', 'invest', 'fund', 'loan', 'credit', 'debt', 'range', 'revenue',

  // Skincare & spa Sector
  'skincare', 'spa', 'makeup', 'hair', 'beauty', 'skin', 'treatment', 'therapy', 'cosmetics', 'hygiene', 'wellness', 'therapeutics', 
  'relaxation', 'rejuvenation', 'recovery', 'hydration', 'nutrition',

  // Fitness Sector
  'fitness', 'exercise', 'gym', 'training', 'nutrition', 'diet', 'health', 'wellness', 'fit', 'routine', 'program',

  // Fashion Sector
  'fashion', 'style', 'trend', 'design', 'brand', 'show',

  // Education Sector
  'education', 'school', 'university', 'college', 'degree', 'training', 'program', 'course', 'certification', 'diploma', 'masters', 'bachelors', 'ma',

  // Tourism Sector
  'tourism', 'travel', 'vacation', 'holiday', 'trip', 'destination', 'experience', 'adventure', 'sightseeing', 'excursion', 'exploration',

  // Religion Sector
  'religion', 'spirituality', 'religious', 'church', 'temple', 'christianity', 'judaism', 'islam', 'buddhism',

  // Sports Sector
  'sports', 'athletics', 'sport', 'team', 'league', 'competition', 'event', 'match', 'game', 'season', 'tournament', 'championship', 'world', 'cup', 'final',

  // Art Sector
  'art', 'design', 'painting', 'sculpture', 'architecture', 'museum', 'gallery', 'exhibition', 'collection',

  // Real-estate Sector
  'real-estate', 'property', 'home', 'rental', 'sale', 'buy', 'buying', 'sell', 'selling', 'housing', 'development',

  // Catering Sector 
  'catering', 'restaurant', 'food', 'menu', 'dining', 'service', 'delivery',

  // Geographic Sector
  'geography', 'location', 'region', 'country', 'city', 'state', 'province', 'county', 'municipality', 'district', 'neighborhood', 'village', 'town', 'street', 'block', 'corner', 'road', 'avenue', 'highway', 'freeway', 'northern', 'southern', 'eastern', 'western', 'north', 'south', 'east', 'west', 'asia', 'pacific',  

  // Govt Sector
  'government', 'governor', 'governor-general', 'governor-general', 'authoritative', 'executive', 'chief', 'chief-executive', 'authority',

  // Hospitality Sector
  'hospitality', 'hotel', 'resort', 'accommodation', 'lodging', 'motel', 'inn', 'guest', 'reception', 'concierge',
  'housekeeping', 'booking', 'reservation', 'check-in', 'check-out', 'front-desk', 'amenities', 'spa', 'conference', 'facilities',

  // Manufacturing Sector
  'manufacturing', 'factory', 'production', 'assembly', 'industrial', 'fabrication', 'processing', 'machinery', 'equipment', 'tooling',
  'automation', 'quality-control', 'inventory', 'supply-chain', 'procurement', 'raw-materials', 'logistics', 'warehouse', 'distribution', 'shipping',

  // Agriculture Sector
  'agriculture', 'farming', 'crop', 'livestock', 'harvest', 'cultivation', 'irrigation', 'organic', 'pesticide', 'fertilizer',
  'sustainable', 'seasonal', 'plantation', 'greenhouse', 'dairy', 'poultry', 'horticulture', 'agribusiness', 'produce', 'yield',

  // Transportation Sector
  'transportation', 'logistics', 'freight', 'shipping', 'cargo', 'delivery', 'fleet', 'vehicle', 'truck', 'carrier',
  'transit', 'distribution', 'import', 'export', 'customs', 'port', 'terminal', 'container', 'forwarding', 'courier',

  // Retail Sector
  'retail', 'store', 'shop', 'outlet', 'merchant', 'seller', 'marketplace', 'inventory', 'checkout', 'shopping',
  'e-commerce', 'point-of-sale', 'display', 'merchandise', 'pricing', 'discount', 'promotion', 'seasonal', 'consumer', 'product',

  // Legal Services Sector
  'legal', 'law', 'attorney', 'lawyer', 'counsel', 'litigation', 'contract', 'compliance', 'regulatory', 'legislation',
  'intellectual-property', 'patent', 'trademark', 'copyright', 'licensing', 'arbitration', 'mediation', 'plaintiff', 'defendant', 'jurisdiction',

  // Energy Sector
  'energy', 'power', 'electricity', 'utility', 'renewable', 'solar', 'wind', 'hydro', 'nuclear', 'fossil-fuel',
  'generation', 'transmission', 'distribution', 'grid', 'consumption', 'efficiency', 'carbon', 'emissions', 'sustainable', 'storage',

  // Telecommunications Sector
  'telecommunications', 'telecom', 'network', 'wireless', 'broadband', 'fiber', 'cable', 'internet', 'mobile', 'data',
  'connectivity', 'bandwidth', 'infrastructure', 'communications', 'provider', 'carrier', 'switching', 'roaming', 'signal', 'spectrum',

  // Automotive Sector
  'automotive', 'vehicle', 'car', 'truck', 'dealer', 'dealership', 'manufacturer', 'maintenance', 'repair', 'parts',
  'service', 'collision', 'warranty', 'inspection', 'bodyshop', 'mechanic', 'diagnostic', 'aftermarket', 'accessories', 'leasing',

  // Insurance Sector
  'insurance', 'policy', 'premium', 'coverage', 'claim', 'underwriting', 'actuary', 'risk', 'liability', 'deductible',
  'reinsurance', 'broker', 'agent', 'adjuster', 'indemnity', 'beneficiary', 'annuity', 'casualty', 'property', 'life',

  // Food Industry Sector
  'food', 'beverage', 'culinary', 'cuisine', 'ingredient', 'recipe', 'menu', 'chef', 'kitchen', 'catering',
  'bakery', 'butcher', 'confectionery', 'delicatessen', 'gourmet', 'organic', 'vegan', 'wholesale', 'specialty', 'artisanal',

  // Event Management Sector
  'event', 'planning', 'coordination', 'venue', 'booking', 'scheduling', 'registration', 'conference', 'exhibition', 'convention',
  'festival', 'ceremony', 'occasion', 'celebration', 'organizer', 'logistic', 'audiovisual', 'decorative', 'catering', 'entertainment',

  // Consulting Sector
  'consulting', 'advisor', 'counsel', 'expert', 'specialist', 'strategist', 'analyst', 'facilitator', 'assessment', 'recommendation',
  'implementation', 'solution', 'methodology', 'framework', 'benchmark', 'optimization', 'efficiency', 'transformation', 'engagement', 'deliverable',

  // Publishing & Media Sector
  'publishing', 'media', 'editorial', 'content', 'publication', 'press', 'journalist', 'editor', 'writer', 'author',
  'broadcaster', 'producer', 'circulation', 'distribution', 'subscription', 'advertising', 'syndication', 'copyright', 'print', 'digital'
]);

/**
 * Additional specialized terms collected from enhanced validation
 */
export const DISALLOWED_NAME_TERMS = [
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

/**
 * Placeholder email patterns that should be filtered
 */
export const PLACEHOLDER_EMAIL_PATTERNS = [
  /first[._]?name/i,
  /last[._]?name/i,
  /first[._]?initial/i,
  /company(domain)?\.com$/i,
  /example\.com$/i,
  /domain\.com$/i,
  /test[._]?user/i,
  /demo[._]?user/i,
  /noreply/i,
  /donotreply/i,
  /placeholder/i,
  /tempmail/i,
  /temp[._]?email/i
];

/**
 * Checks if a name is a known placeholder or test name
 * @param name The name to check
 * @returns true if the name is a placeholder name
 */
export function isPlaceholderName(name: string): boolean {
  const normalizedName = name.toLowerCase();
  return PLACEHOLDER_NAMES.has(normalizedName) || 
         normalizedName.includes('test') || 
         normalizedName.includes('demo') ||
         normalizedName.includes('example') ||
         normalizedName.includes('admin') ||
         normalizedName.includes('guest') ||
         normalizedName.includes('user');
}

/**
 * Checks if an email is a placeholder or test email
 * @param email The email to check
 * @returns true if the email is a placeholder email
 */
export function isPlaceholderEmail(email: string): boolean {
  return PLACEHOLDER_EMAIL_PATTERNS.some(pattern => pattern.test(email));
}

/**
 * Checks if a name contains generic business terms
 * @param name The name to check
 * @returns The count of generic terms found in the name
 */
export function countGenericTerms(name: string): number {
  const nameLower = name.toLowerCase();
  const words = nameLower.split(/[\s-]+/);
  
  return words.filter(word => 
    GENERIC_TERMS.has(word) || PLACEHOLDER_NAMES.has(word)
  ).length;
}

/**
 * Calculates a penalty score for names containing generic terms
 * @param name The name to check
 * @returns A penalty value (higher for more generic terms)
 */
export function calculateGenericTermPenalty(name: string): number {
  const genericCount = countGenericTerms(name);
  
  if (genericCount === 0) return 0;
  
  // Exponential penalty - one generic term is bad, more than one is catastrophic
  let penalty = genericCount * 35;
  
  // Additional penalty for multiple generic terms
  if (genericCount > 1) {
    penalty += 20;
  }
  
  return Math.min(75, penalty); // Cap at 75 points
}

/**
 * Checks for disallowed terms in a name
 * @param name The name to check
 * @returns True if the name contains disallowed terms
 */
export function containsDisallowedTerm(name: string): boolean {
  const lowerName = name.toLowerCase();
  const parts = lowerName.split(/\s+/);
  
  return DISALLOWED_NAME_TERMS.some(term => 
    parts.includes(term) || 
    lowerName.includes(` ${term} `) || 
    lowerName.startsWith(`${term} `) || 
    lowerName.endsWith(` ${term}`)
  );
}