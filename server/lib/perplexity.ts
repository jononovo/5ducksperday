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
  prompt: string
): Promise<string> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a business intelligence analyst. Provide detailed, factual information about companies."
    },
    {
      role: "user",
      content: prompt.replace("[COMPANY]", companyName)
    }
  ];

  // Add specific differentiation analysis
  if (prompt.toLowerCase().includes("differentiation")) {
    messages[0].content += " Focus on unique selling propositions and competitive advantages. Provide exactly 3 short, impactful bullet points.";
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
    // Extract website URLs
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

    // Rest of the parsing logic
    if (result.includes("employees") || result.includes("staff")) {
      const sizeMatch = result.match(/(\d+)\s*(employees|staff)/i);
      if (sizeMatch) {
        companyData.size = parseInt(sizeMatch[1]);
      }
    }

    if (result.includes("founded") || result.includes("established")) {
      const yearMatch = result.match(/founded\s*in\s*(\d{4})/i);
      if (yearMatch) {
        const foundedYear = parseInt(yearMatch[1]);
        companyData.age = new Date().getFullYear() - foundedYear;
      }
    }

    if (result.toLowerCase().includes("services") || result.toLowerCase().includes("offerings")) {
      const services = result
        .split(/[.,;]/)
        .filter(s =>
          s.toLowerCase().includes("service") ||
          s.toLowerCase().includes("offering") ||
          s.toLowerCase().includes("solution")
        )
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (services.length > 0) {
        companyData.services = services;
      }
    }

    const validationPoints = result
      .split(/[.!?]/)
      .map(s => s.trim())
      .filter(s =>
        s.length > 20 &&
        (s.includes("success") || s.includes("achievement") || s.includes("award"))
      );

    if (validationPoints.length > 0) {
      companyData.validationPoints = validationPoints;
    }

    let score = 50;
    if (companyData.size && companyData.size > 50) score += 10;
    if (companyData.age && companyData.age > 5) score += 10;
    if (companyData.services && companyData.services.length > 2) score += 10;
    if (companyData.validationPoints && companyData.validationPoints.length > 0) score += 10;
    if (companyData.differentiation && companyData.differentiation.length === 3) score += 10;

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
    'leadership', 'team', 'member', 'staff', 'employee', 'general',
    'key', 'role', 'position', 'department', 'division', 'management',
    'contact', 'person', 'representative', 'individual'
  ];

  return genericTerms.some(term =>
    name.toLowerCase().includes(term.toLowerCase()) ||
    name.split(' ').some(part => term.toLowerCase() === part.toLowerCase())
  );
}

export function extractContacts(analysisResults: string[]): Partial<Contact>[] {
  const contactMap = new Map<string, Partial<Contact> & { score: number }>();

  // Primary decision-maker roles
  const decisionMakerRoles = {
    'CEO': 10,
    'Chief Executive Officer': 10,
    'Founder': 10,
    'Co-Founder': 10,
    'Owner': 10,
    'Managing Director': 9,
    'President': 9,
    'Principal': 9
  };

  // Secondary leadership roles for fallback
  const leadershipRoles = {
    'CTO': 8,
    'Chief Technology Officer': 8,
    'COO': 8,
    'Chief Operating Officer': 8,
    'CFO': 8,
    'Chief Financial Officer': 8,
    'VP': 7,
    'Vice President': 7,
    'Director': 6,
    'Head of': 5
  };

  // Enhanced regex patterns
  const emailRegex = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
  const nameRegex = /([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})(?:\s+[A-Z][a-z]{1,20})?/g;

  // Organization suffixes to filter out
  const orgSuffixes = [
    'Inc', 'LLC', 'Ltd', 'Limited', 'Corp', 'Corporation', 'Co', 'Company',
    'Group', 'Holdings', 'Services', 'Solutions', 'Technologies', 'Systems'
  ];

  for (const result of analysisResults) {
    const names = Array.from(result.matchAll(nameRegex))
      .map(match => match[0])
      .filter(name => {
        // Filter out organization names
        if (orgSuffixes.some(suffix =>
          name.includes(suffix) ||
          name.includes(suffix.toUpperCase())
        )) {
          return false;
        }

        // Filter out generic names
        if (isGenericName(name)) {
          return false;
        }

        // Additional validation for names
        const nameParts = name.split(' ');
        return (
          nameParts.length >= 2 && // Must have at least first and last name
          nameParts.length <= 3 && // No more than three parts
          nameParts.every(part =>
            part.length >= 2 && // Each part must be at least 2 chars
            part.length <= 20 && // Each part must be no more than 20 chars
            /^[A-Z][a-z]+$/.test(part) // Must start with capital letter, followed by lowercase
          )
        );
      });

    const emails = (result.match(emailRegex) || [])
      .filter(email => !isPlaceholderEmail(email));

    for (const name of names) {
      // First try to find decision-maker roles
      let nearestRole = Object.entries(decisionMakerRoles).find(([role]) =>
        result.toLowerCase().includes(`${name.toLowerCase()}`) &&
        result.toLowerCase().includes(role.toLowerCase()) &&
        Math.abs(
          result.toLowerCase().indexOf(name.toLowerCase()) -
          result.toLowerCase().indexOf(role.toLowerCase())
        ) < 100
      );

      // If no decision-maker role found, try leadership roles
      if (!nearestRole) {
        nearestRole = Object.entries(leadershipRoles).find(([role]) =>
          result.toLowerCase().includes(`${name.toLowerCase()}`) &&
          result.toLowerCase().includes(role.toLowerCase()) &&
          Math.abs(
            result.toLowerCase().indexOf(name.toLowerCase()) -
            result.toLowerCase().indexOf(role.toLowerCase())
          ) < 100
        );
      }

      if (nearestRole) {
        const nearestEmail = emails.find(email =>
          result.indexOf(email) - result.indexOf(name) < 100 &&
          result.indexOf(email) - result.indexOf(name) > -100
        );

        const score = nearestRole[1] + (nearestEmail ? 5 : 0);
        const contactKey = `${name}-${nearestRole[0]}-${nearestEmail || ''}`;

        if (!contactMap.has(contactKey) || contactMap.get(contactKey)!.score < score) {
          contactMap.set(contactKey, {
            name,
            email: nearestEmail || null,
            role: nearestRole[0],
            priority: nearestRole[1] >= 9 ? 1 : nearestRole[1] >= 7 ? 2 : 3, // Priority based on role importance
            score
          });
        }
      }
    }
  }

  // Return only the highest scored contacts
  return Array.from(contactMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Limit to top 3 contacts
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