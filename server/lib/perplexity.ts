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

// Simple delay between requests
const REQUEST_DELAY = 1000; // 1 second
let lastRequestTime = 0;

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function queryPerplexity(messages: PerplexityMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("Perplexity API key is not configured. Please set the PERPLEXITY_API_KEY environment variable.");
  }

  // Ensure minimum delay between requests
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < REQUEST_DELAY) {
    await wait(REQUEST_DELAY - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

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

export async function searchLeadership(companyName: string): Promise<string> {
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a business intelligence analyst. Find the key leadership team members of the company. Focus on C-level executives, founders, directors, and department heads. Include their full names, roles, and business email addresses when available. Be precise and factual."
    },
    {
      role: "user",
      content: `Who are the key leadership team members of ${companyName}? Please include their full names, roles, and business email addresses if available. Focus on C-level executives, founders, and directors.`
    }
  ];

  return queryPerplexity(messages);
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

  const initialAnalysis = await queryPerplexity(messages);

  // Additional leadership search
  const leadershipInfo = await searchLeadership(companyName);

  // Combine both results
  return `${initialAnalysis}\n\nLeadership Information:\n${leadershipInfo}`;
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

export function extractContacts(analysisResults: string[]): Partial<Contact>[] {
  const contactMap = new Map<string, Partial<Contact>>();

  // Role priority scoring
  const getRolePriority = (role: string): number => {
    const normalizedRole = role.toLowerCase();
    if (normalizedRole.includes('ceo') || normalizedRole.includes('founder') || normalizedRole.includes('president')) return 1;
    if (normalizedRole.includes('cto') || normalizedRole.includes('coo') || normalizedRole.includes('cfo')) return 2;
    if (normalizedRole.includes('director') || normalizedRole.includes('vp') || normalizedRole.includes('head')) return 3;
    if (normalizedRole.includes('manager') || normalizedRole.includes('lead')) return 4;
    return 5;
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) &&
           !email.includes('example.com') &&
           !email.includes('domain.com');
  };

  for (const result of analysisResults) {
    // Extract names with titles (e.g., "John Smith, CEO" or "CEO John Smith")
    const nameRolePatterns = [
      /([A-Z][a-z]+ [A-Z][a-z]+)(?:,?\s*)(CEO|CTO|CFO|Director|VP|President|Founder|Manager|Head of[^,\.]*)/gi,
      /(CEO|CTO|CFO|Director|VP|President|Founder|Manager|Head of[^,\.]*)(?:\s+)([A-Z][a-z]+ [A-Z][a-z]+)/gi
    ];

    for (const pattern of nameRolePatterns) {
      let match;
      while ((match = pattern.exec(result)) !== null) {
        const [, nameOrRole1, roleOrName2] = match;
        const isNameFirst = /^[A-Z]/.test(nameOrRole1);
        const name = isNameFirst ? nameOrRole1 : roleOrName2;
        const role = isNameFirst ? roleOrName2 : nameOrRole1;

        if (!contactMap.has(name)) {
          contactMap.set(name, {
            name,
            role,
            email: null,
            priority: getRolePriority(role)
          });
        }
      }
    }

    // Extract and match emails
    const emailMatches = result.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    for (const email of emailMatches) {
      if (!isValidEmail(email)) continue;

      // Try to find the name associated with this email in the surrounding text
      const surroundingText = result.substring(
        Math.max(0, result.indexOf(email) - 100),
        Math.min(result.length, result.indexOf(email) + 100)
      );

      // Look for names near the email
      const nearbyName = Array.from(contactMap.keys()).find(name => 
        surroundingText.includes(name)
      );

      if (nearbyName) {
        const contact = contactMap.get(nearbyName)!;
        contact.email = email;
        // Increase priority if they have a direct email
        contact.priority = Math.max(1, contact.priority! - 1);
      }
    }
  }

  // Convert to array, sort by priority, and limit to top 5
  return Array.from(contactMap.values())
    .sort((a, b) => {
      // First by priority
      const priorityDiff = (a.priority || 5) - (b.priority || 5);
      if (priorityDiff !== 0) return priorityDiff;

      // Then prefer contacts with email
      if (a.email && !b.email) return -1;
      if (!a.email && b.email) return 1;

      return 0;
    })
    .slice(0, 5);
}