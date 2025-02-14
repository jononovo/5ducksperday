import type { Company, Contact } from "@shared/schema";

interface PerplexityMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface PerplexityResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is not configured. Please set the PERPLEXITY_API_KEY environment variable.");
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-sonar-small-128k-online",
        messages,
        temperature: 0.2,
        max_tokens: 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Perplexity API error (${response.status}): ${errorBody || response.statusText}`);
    }

    const data = await response.json() as PerplexityResponse;
    return data.choices[0].message.content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query Perplexity API: ${error.message}`);
    }
    throw error;
  }
}

export async function searchCompanies(query: string): Promise<string[]> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a business intelligence analyst. List exactly 5 real company names that match the search criteria. Format your response as a simple list with one company name per line, nothing else."
    },
    {
      role: "user",
      content: `Find 5 companies that match this criteria: ${query}`
    }
  ];

  const response = await queryPerplexity(messages);
  return response.split('\n').filter(line => line.trim()).slice(0, 5);
}

export async function analyzeCompany(
  companyName: string,
  userPrompt: string,
  technicalPrompt?: string | null,
  responseStructure?: string | null
): Promise<string> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: technicalPrompt || "You are a business intelligence analyst. Provide detailed, factual information about companies."
    },
    {
      role: "user",
      content: (userPrompt || "").replace("[COMPANY]", companyName)
    }
  ];

  // If response structure is provided, append it to the system message
  if (responseStructure) {
    messages[0].content += `\n\nProvide your response in the following JSON structure:\n${responseStructure}`;
  }

  return queryPerplexity(messages);
}

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    differentiation: [],
    totalScore: 0,
    snapshot: {}
  };

  for (const result of analysisResults) {
    try {
      // Try to parse the result as JSON first (for structured responses)
      const jsonData = JSON.parse(result);

      // Extract decision makers as contacts
      const contacts: Partial<Contact>[] = [];

      // Process up to 5 decision makers
      for (let i = 1; i <= 5; i++) {
        const decisionMaker = jsonData[`decision_maker_${i}`];
        if (decisionMaker?.name) {
          contacts.push({
            name: decisionMaker.name,
            role: decisionMaker.designation,
            email: decisionMaker.email,
            probability: i // Changed to probability
          });
        }
      }

      // Add the contacts to company data
      if (contacts.length > 0) {
        companyData.contacts = contacts;
      }

      // Extract other fields from JSON response
      if (jsonData.website) companyData.website = jsonData.website;
      if (jsonData.size) companyData.size = jsonData.size;

      continue;
    } catch (e) {
      // If JSON parsing fails, continue with regular text parsing
      console.log('Falling back to text parsing for result:', e);
    }

    // Rest of the existing parsing logic for non-JSON responses
    const websiteRegex = /(?:website|url|web\s*site):\s*(https?:\/\/[^\s,)]+)/i;
    const websiteMatch = result.match(websiteRegex);
    if (websiteMatch) {
      companyData.website = websiteMatch[1];
    }

    // Extract profile URLs (LinkedIn, etc.)
    const profileRegex = /(?:profile|linkedin|company\s*profile):\s*(https?:\/\/[^\s,)]+)/i;
    const profileMatch = result.match(profileRegex);
    if (profileMatch) {
      companyData.alternativeProfileUrl = profileMatch[1];
    }

    // Extract differentiation points
    if (result.toLowerCase().includes("differentiat") || result.toLowerCase().includes("unique")) {
      const points = result
        .split(/[.!?•]/)
        .map(s => s.trim())
        .filter(s =>
          s.length > 0 &&
          s.length <= 30 &&
          (s.toLowerCase().includes("unique") ||
            s.toLowerCase().includes("only") ||
            s.toLowerCase().includes("leading") ||
            s.toLowerCase().includes("best"))
        )
        .slice(0, 3);

      if (points.length > 0) {
        companyData.differentiation = points;
      }
    }

    if (result.includes("employees") || result.includes("staff")) {
      const sizeMatch = result.match(/(\d+)\s*(employees|staff)/i);
      if (sizeMatch) {
        companyData.size = parseInt(sizeMatch[1]);
      }
    }

    // Calculate score based on available information
    let score = 50;
    if (companyData.size && companyData.size > 50) score += 10;
    if (companyData.contacts && companyData.contacts.length > 0) score += 20;
    if (companyData.differentiation && companyData.differentiation.length === 3) score += 20;

    companyData.totalScore = Math.min(100, score);
  }

  return companyData;
}

function isPlaceholderEmail(email: string): boolean {
  const placeholderPatterns = [
    /first[._]?name/i,
    /last[._]?name/i,
    /first[._]?initial/i,
    /company(domain)?\.com$/i,
    /example\.com$/i,
    /domain\.com$/i
  ];
  return placeholderPatterns.some(pattern => pattern.test(email));
}

function isGenericName(name: string): boolean {
  const genericTerms = [
    // Existing terms
    'leadership', 'team', 'member', 'staff', 'employee', 'general',
    'key', 'role', 'position', 'department', 'division', 'management',
    'contact', 'person', 'representative', 'individual',
    // Additional generic terms
    'business', 'company', 'enterprise', 'organization', 'corporation',
    'admin', 'administrator', 'manager', 'executive', 'professional',
    'specialist', 'coordinator', 'associate', 'analyst', 'consultant',
    'service', 'support', 'office', 'personnel', 'resource',
    'operation', 'development', 'sales', 'marketing', 'customer'
  ];

  const name_lower = name.toLowerCase();

  // Check for exact matches of generic terms
  if (genericTerms.some(term => name_lower === term)) {
    return true;
  }

  // Check for partial matches that might indicate a generic title
  if (genericTerms.some(term =>
    name_lower.includes(term) ||
    name_lower.startsWith(term) ||
    name_lower.endsWith(term)
  )) {
    return true;
  }

  // Check for common patterns that might indicate a generic or placeholder name
  const genericPatterns = [
    /^[a-z\s]+$/i,  // All lowercase or uppercase
    /^(mr|mrs|ms|dr|prof)\.\s+[a-z]+$/i,  // Title without full name
    /^(the|our|your|their)\s+/i,  // Possessive starts
    /\d+/,  // Contains numbers
    /^[a-z]{1,2}\s+[a-z]{1,2}$/i,  // Very short names
    /^(contact|info|support|help|sales|service)/i,  // Common department starts
    /^[^a-z]+$/i  // Contains no letters
  ];

  if (genericPatterns.some(pattern => pattern.test(name_lower))) {
    return true;
  }

  return false;
}

function validateNameFormat(name: string): boolean {
  // Split the name into parts
  const parts = name.split(/\s+/);

  // Basic validation rules
  const validNameRules = [
    // Each part should be 2-20 characters
    parts.every(part => part.length >= 2 && part.length <= 20),

    // Must have at least two parts (first and last name)
    parts.length >= 2 && parts.length <= 4,

    // Each part should start with a capital letter followed by lowercase
    parts.every(part => /^[A-Z][a-z]+$/.test(part)),

    // No numbers or special characters
    !/[0-9!@#$%^&*(),.?":{}|<>]/.test(name),

    // Not too many repeated characters
    !parts.some(part => /(.)(?=\1{2,})/g.test(part))
  ];

  return validNameRules.every(rule => rule);
}

function calculateNameConfidenceScore(name: string, context: string): number {
  let score = 0;
  const namePattern = /[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}/;

  // Base score for proper name format
  if (namePattern.test(name)) {
    score += 30;
  }

  // Additional points for context indicators
  const contextIndicators = {
    leadership: ['leads', 'directs', 'manages', 'founded', 'oversees'],
    title: ['ceo', 'cto', 'founder', 'president', 'director'],
    introduction: ['meet', 'introducing', 'led by', 'headed by', 'under the leadership of'],
    verification: ['linkedin', 'profile', 'contact', 'verified', 'official'],
    designation: ['mr', 'ms', 'mrs', 'dr', 'prof']
  };

  const contextLower = context.toLowerCase();
  const nameLower = name.toLowerCase();

  // Check context indicators
  Object.entries(contextIndicators).forEach(([category, indicators]) => {
    if (indicators.some(indicator => contextLower.includes(indicator))) {
      score += category === 'leadership' || category === 'verification' ? 15 : 10;
    }
  });

  // Deduct points for common red flags
  const redFlags = [
    /\d+/,  // Contains numbers
    /[^a-zA-Z\s'-]/,  // Contains special characters (except hyphen and apostrophe)
    /^[a-z]/,  // Doesn't start with capital letter
    /\s[a-z]/,  // Word doesn't start with capital letter
    /(.)\1{2,}/  // Three or more repeated characters
  ];

  redFlags.forEach(flag => {
    if (flag.test(name)) {
      score -= 20;
    }
  });

  // Check name parts
  const nameParts = name.split(/\s+/);
  if (nameParts.length === 2 || nameParts.length === 3) {
    score += 15;
  } else {
    score -= 10;
  }

  // Check for professional email correlation
  const emailMatch = context.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    const email = emailMatch[0].toLowerCase();
    const nameWords = nameLower.split(/\s+/);
    if (nameWords.some(word => email.includes(word))) {
      score += 20;
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function extractContacts(analysisResults: string[]): Partial<Contact>[] {
  const contactMap = new Map<string, Partial<Contact> & { score: number }>();

  // Primary decision-maker roles with context variations
  const decisionMakerPatterns = [
    { role: 'CEO', variations: ['Chief Executive Officer', 'Chief Executive', 'CEO'], score: 10 },
    { role: 'Owner', variations: ['Owner', 'Principal Owner', 'Managing Owner', 'Business Owner'], score: 10 },
    { role: 'Founder', variations: ['Founder', 'Co-Founder', 'Founding Partner'], score: 10 },
    { role: 'President', variations: ['President', 'Company President'], score: 9 },
    { role: 'Managing Director', variations: ['Managing Director', 'MD'], score: 9 },
    { role: 'Principal', variations: ['Principal', 'Managing Principal'], score: 9 }
  ];

  // Leadership context indicators
  const leadershipIndicators = [
    'leads', 'founded', 'started', 'owns', 'runs', 'heads',
    'established', 'launched', 'directs', 'manages', 'oversees'
  ];

  // Ownership context patterns
  const ownershipPatterns = [
    /founded (?:by|in \d{4} by)/i,
    /(?:owned|run|managed|led) by/i,
    /(?:the|company's) (?:owner|founder|principal)/i,
    /(?:primary|main) decision[- ]maker/i
  ];

  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const nameRegex = /([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?:\s+[A-Z][a-z]{1,20})?/g;

  // Organization suffixes to filter out
  const orgSuffixes = [
    'Inc', 'LLC', 'Ltd', 'Limited', 'Corp', 'Corporation', 'Co', 'Company',
    'Group', 'Holdings', 'Services', 'Solutions', 'Technologies', 'Systems'
  ];

  for (const result of analysisResults) {
    try {
      // Try to parse JSON first
      const jsonData = JSON.parse(result);

      // Extract decision makers from JSON structure
      for (let i = 1; i <= 5; i++) {
        const decisionMaker = jsonData[`decision_maker_${i}`];
        if (decisionMaker?.name && !isGenericName(decisionMaker.name)) {
          const probability = Math.min(100, (6 - i) * 20); // Higher probability for earlier entries
          const key = normalizeContactKey(decisionMaker.name, decisionMaker.email);
          if (!contactMap.has(key) || contactMap.get(key)!.probability! < probability) {
            contactMap.set(key, {
              name: decisionMaker.name,
              role: decisionMaker.designation,
              email: decisionMaker.email,
              probability,
              score: probability / 5
            });
          }
        }
      }
    } catch (e) {
      console.log('JSON parsing failed, falling back to text extraction:', e);

      const names = Array.from(result.matchAll(nameRegex))
        .map(match => match[0])
        .filter(name => {
          // Relaxed name validation
          if (orgSuffixes.some(suffix =>
            name.includes(suffix) ||
            name.includes(suffix.toUpperCase())
          )) {
            return false;
          }

          const nameParts = name.split(' ');
          return (
            nameParts.length >= 2 &&
            nameParts.length <= 3 &&
            nameParts.every(part =>
              part.length >= 2 &&
              /^[A-Z][a-z]+$/.test(part)
            )
          );
        });

      const emails = (result.match(emailRegex) || [])
        .filter(email => !isPlaceholderEmail(email));

      for (const name of names) {
        let bestRole = null;
        let bestScore = 0;
        const nameContext = result.substring(
          Math.max(0, result.indexOf(name) - 100),
          Math.min(result.length, result.indexOf(name) + 100)
        ).toLowerCase();

        // Check for decision-maker patterns
        for (const pattern of decisionMakerPatterns) {
          for (const variation of pattern.variations) {
            if (nameContext.includes(variation.toLowerCase())) {
              const distance = Math.abs(
                nameContext.indexOf(variation.toLowerCase()) -
                nameContext.indexOf(name.toLowerCase())
              );
              const proximityScore = Math.max(0, 5 - Math.floor(distance / 20));
              const score = pattern.score + proximityScore;

              if (score > bestScore) {
                bestRole = pattern.role;
                bestScore = score;
              }
            }
          }
        }

        // More lenient scoring for leadership context
        const hasLeadershipContext = leadershipIndicators.some(indicator =>
          nameContext.includes(indicator)
        );
        if (hasLeadershipContext) {
          bestScore += 3;
        }

        // More lenient scoring for ownership context
        const hasOwnershipContext = ownershipPatterns.some(pattern =>
          pattern.test(nameContext)
        );
        if (hasOwnershipContext) {
          bestScore += 5;
        }

        // Lower threshold for accepting contacts
        if (bestScore >= 5) { // Reduced from 8
          const nearestEmail = emails.find(email =>
            Math.abs(result.indexOf(email) - result.indexOf(name)) < 200 // Increased from 100
          );

          if (nearestEmail) {
            bestScore += 5;
          }

          const probability = Math.min(100, bestScore * 8); // More generous probability calculation

          const key = normalizeContactKey(`${name}-${bestRole || 'Leader'}-${nearestEmail || ''}`, nearestEmail);

          if (!contactMap.has(key) || contactMap.get(key)!.score < bestScore) {
            contactMap.set(key, {
              name,
              email: nearestEmail || null,
              role: bestRole || 'Leader',
              probability,
              score: bestScore
            });
          }
        }
      }
    }
  }

  return Array.from(contactMap.values())
    .map(contact => {
      const contextForName = analysisResults.find(result =>
        result.includes(contact.name)
      ) || '';

      const confidenceScore = calculateNameConfidenceScore(
        contact.name,
        contextForName
      );

      return {
        ...contact,
        nameConfidenceScore: confidenceScore,
        // Adjust probability based on confidence score
        probability: Math.round((contact.probability || 0) * (confidenceScore / 100))
      };
    })
    .sort((a, b) => (b.probability || 0) - (a.probability || 0))
    .filter(contact => (contact.probability || 0) > 20); // Filter out very low probability contacts
}

function normalizeContactKey(name: string, email: string | null): string {
  // Normalize the name by removing spaces and converting to lowercase
  const normalizedName = name.toLowerCase().replace(/\s+/g, '');
  // If email exists, combine with normalized name, otherwise just use name
  return email ? `${normalizedName}-${email.toLowerCase()}` : normalizedName;
}

function findBestRole(
  nameContext: string,
  patterns: Array<{ role: string; variations: string[]; score: number }>
): { bestRole: string | null; bestScore: number } {
  let bestRole = null;
  let bestScore = 0;

  for (const pattern of patterns) {
    for (const variation of pattern.variations) {
      if (nameContext.includes(variation.toLowerCase())) {
        const distance = Math.abs(
          nameContext.indexOf(variation.toLowerCase())
        );
        const proximityScore = Math.max(0, 5 - Math.floor(distance / 20));
        const score = pattern.score + proximityScore;

        if (score > bestScore) {
          bestRole = pattern.role;
          bestScore = score;
        }
      }
    }
  }

  if (nameContext.includes('founder') || nameContext.includes('owner')) {
    bestScore += 5;
  }
  if (nameContext.includes('ceo') || nameContext.includes('president')) {
    bestScore += 4;
  }

  return { bestRole, bestScore };
}

function findNearestEmail(result: string, name: string, emails: string[]): string | null {
  if (emails.length === 0) return null;

  const nameIndex = result.indexOf(name);
  let nearestEmail = null;
  let shortestDistance = Infinity;

  for (const email of emails) {
    const emailIndex = result.indexOf(email);
    const distance = Math.abs(emailIndex - nameIndex);

    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestEmail = email;
    }
  }

  return shortestDistance <= 200 ? nearestEmail : null;
}

function parseLocalSourceDetails(response: string): LocalSourcesSearchResult {
  const details: LocalSourcesSearchResult = {};

  // Extract email if found - only match actual email addresses
  const emailMatch = response.match(/(?:email|contact):\s*([\w.+-]+@[\w-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch && !isPlaceholderEmail(emailMatch[1])) {
    details.email = emailMatch[1];
  }

  // Extract role information
  const roleMatch = response.match(/(?:role|position|title):\s*([^.\n]+)/i);
  if (roleMatch && !isGenericName(roleMatch[1])) {
    details.role = roleMatch[1].trim();
  }

  // Extract LinkedIn URL if mentioned
  const linkedinMatch = response.match(/linkedin\.com\/in\/[\w-]+/);
  if (linkedinMatch) {
    details.linkedinUrl = `https://www.${linkedinMatch[0]}`;
  }

  // Extract location information
  const locationMatch = response.match(/(?:location|based in|located in):\s*([^.\n]+)/i);
  if (locationMatch) {
    details.location = locationMatch[1].trim();
  }

  // Extract department if mentioned
  const deptMatch = response.match(/(?:department|division):\s*([^.\n]+)/i);
  if (deptMatch) {
    details.department = deptMatch[1].trim();
  }

  return details;
}

interface LocalSourcesSearchResult {
  email?: string | null;
  role?: string | null;
  linkedinUrl?: string | null;
  location?: string | null;
  department?: string | null;
  completedSearches?: string[]; // Add tracking of completed searches
}

async function deepSearchLocalSources(name: string, company: string, enabledSearches: Record<string, boolean>): Promise<LocalSourcesSearchResult> {
  const completedSearches: string[] = [];
  const details: LocalSourcesSearchResult = {};

  try {
    // Create base messages for all searches
    const baseMessages: PerplexityMessage[] = [
      {
        role: "system",
        content: `You are a specialized contact researcher focusing on local business sources. Format your response using clear labels for each piece of information found about ${name} from ${company}.`
      }
    ];

    // Perform enabled searches sequentially
    if (enabledSearches['local-news']) {
      console.log('Executing local news search...');
      const newsMessages = [...baseMessages];
      newsMessages[0].content += ` Focus on local news articles, press releases, and media coverage.`;
      newsMessages.push({
        role: "user",
        content: `Find information about ${name} from ${company} in local news sources, including speaking engagements and community involvement.`
      });

      const newsResponse = await queryPerplexity(newsMessages);
      const newsDetails = parseLocalSourceDetails(newsResponse);
      Object.assign(details, newsDetails);
      completedSearches.push('local-news');
    }

    if (enabledSearches['business-associations']) {
      console.log('Executing business associations search...');
      const assocMessages = [...baseMessages];
      assocMessages[0].content += ` Focus on business associations, chambers of commerce, and professional organizations.`;
      assocMessages.push({
        role: "user",
        content: `Find information about ${name} from ${company} in local business association memberships and leadership roles.`
      });

      const assocResponse = await queryPerplexity(assocMessages);
      const assocDetails = parseLocalSourceDetails(assocResponse);
      Object.assign(details, assocDetails);
      completedSearches.push('business-associations');
    }

    if (enabledSearches['local-events']) {
      console.log('Executing local events search...');
      const eventMessages = [...baseMessages];
      eventMessages[0].content += ` Focus on local business events, conferences, and speaking engagements.`;
      eventMessages.push({
        role: "user",
        content: `Find information about ${name} from ${company} in local business events and speaking engagements.`
      });

      const eventResponse = await queryPerplexity(eventMessages);
      const eventDetails = parseLocalSourceDetails(eventResponse);
      Object.assign(details, eventDetails);
      completedSearches.push('local-events');
    }

    if (enabledSearches['local-classifieds']) {
      console.log('Executing local classifieds search...');
      const classifiedMessages = [...baseMessages];
      classifiedMessages[0].content += ` Focus on local business listings and classifieds.`;
      classifiedMessages.push({
        role: "user",
        content: `Find information about ${name} from ${company} in local business listings and classifieds.`
      });

      const classifiedResponse = await queryPerplexity(classifiedMessages);
      const classifiedDetails = parseLocalSourceDetails(classifiedResponse);
      Object.assign(details, classifiedDetails);
      completedSearches.push('local-classifieds');
    }

    console.log('Completed searches:', completedSearches);
    console.log('Found details:', details);

    return { ...details, completedSearches };
  } catch (error) {
    console.error('Error in deepSearchLocalSources:', error);
    return { completedSearches };
  }
}



export async function searchContactDetails(
  name: string,
  company: string,
  includeLocalSources: boolean = false,
  enabledSearches: Record<string, boolean> = {}
): Promise<LocalSourcesSearchResult & Partial<Contact>> {
  // Basic contact details
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: `You are a contact information researcher. Find detailed professional information about the specified person. Focus on:
1. Current role and department
2. Professional email format
3. LinkedIn profile URL
4. Location
5. Other verifiable contact details
Format your response in a structured way that's easy to parse.`
    },
    {
      role: "user",
      content: `Find detailed professional contact information for ${name} at ${company}. Include email, LinkedIn URL, role details, and location if available.`
    }
  ];

  const response = await queryPerplexity(messages);
  let contactDetails = parseContactDetails(response);

  if (includeLocalSources) {
    const localDetails = await deepSearchLocalSources(name, company, enabledSearches);
    return {
      ...contactDetails,
      ...localDetails,
      verificationSource: 'Local Sources',
      completedSearches: localDetails.completedSearches || []
    };
  }

  return {
    ...contactDetails,
    completedSearches: []
  };
}

function parseContactDetails(response: string): Partial<Contact> {
  const contact: Partial<Contact> = {};

  // Extract email if found
  const emailMatch = response.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  if (emailMatch && !isPlaceholderEmail(emailMatch[0])) {
    contact.email = emailMatch[0];
  }

  // Extract LinkedIn URL
  const linkedinMatch = response.match(/linkedin\.com\/in\/[\w-]+/);
  if (linkedinMatch) {
    contact.linkedinUrl = `https://www.${linkedinMatch[0]}`;
  }

  // Extract role information
  const roleMatch = response.match(/(?:role|position|title):\s*([^.\n]+)/i);
  if (roleMatch && !isGenericName(roleMatch[1])) {
    contact.role = roleMatch[1].trim();
  }

  // Extract department
  const deptMatch = response.match(/(?:department|division):\s*([^.\n]+)/i);
  if (deptMatch) {
    contact.department = deptMatch[1].trim();
  }

  // Extract location
  const locationMatch = response.match(/(?:location|based in|located in):\s*([^.\n]+)/i);
  if (locationMatch) {
    contact.location = locationMatch[1].trim();
  }

  return contact;
}