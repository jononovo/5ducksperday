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
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PERPLEXITY_API_KEY}`,
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
    throw new Error(`Perplexity API error: ${response.statusText}`);
  }

  const data = await response.json() as PerplexityResponse;
  return data.choices[0].message.content;
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

    // Rest of the parsing logic remains unchanged
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
  const contacts: Partial<Contact>[] = [];

  for (const result of analysisResults) {
    const emailMatches = result.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    const nameMatches = result.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [];
    const roleMatches = result.match(/(CEO|CTO|Director|Manager|Head of|Founder)/gi) || [];

    for (let i = 0; i < Math.max(emailMatches.length, nameMatches.length); i++) {
      contacts.push({
        name: nameMatches[i] || "Unknown",
        email: emailMatches[i] || null,
        role: roleMatches[i] || null,
        priority: i < 3 ? i + 1 : 3
      });
    }
  }

  return contacts;
}