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

  return queryPerplexity(messages);
}

export function parseCompanyData(analysisResults: string[]): Partial<Company> {
  // Extract key information from AI responses
  const companyData: Partial<Company> = {
    services: [],
    validationPoints: [],
    totalScore: 0,
    snapshot: {}
  };

  for (const result of analysisResults) {
    // Basic extraction - this can be enhanced with more sophisticated parsing
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

    // Extract services
    if (result.toLowerCase().includes("services") || result.toLowerCase().includes("offerings")) {
      const services = result
        .split(/[.,;]/)
        .filter(s => 
          s.toLowerCase().includes("education") || 
          s.toLowerCase().includes("training") ||
          s.toLowerCase().includes("course")
        )
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (services.length > 0) {
        companyData.services = services;
      }
    }

    // Extract validation points
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

    // Calculate a basic score based on various factors
    let score = 50; // Base score
    if (companyData.size && companyData.size > 50) score += 10;
    if (companyData.age && companyData.age > 5) score += 10;
    if (companyData.services && companyData.services.length > 2) score += 10;
    if (companyData.validationPoints && companyData.validationPoints.length > 0) score += 20;

    companyData.totalScore = Math.min(100, score);
  }

  return companyData;
}

export function extractContacts(analysisResults: string[]): Partial<Contact>[] {
  const contacts: Partial<Contact>[] = [];

  for (const result of analysisResults) {
    // Look for patterns that might indicate contact information
    const emailMatches = result.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    const nameMatches = result.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [];
    const roleMatches = result.match(/(CEO|CTO|Director|Manager|Head of|Founder)/gi) || [];

    // Combine the information into contact objects
    for (let i = 0; i < Math.max(emailMatches.length, nameMatches.length); i++) {
      contacts.push({
        name: nameMatches[i] || "Unknown",
        email: emailMatches[i] || null,
        role: roleMatches[i] || null,
        priority: i < 3 ? i + 1 : 3 // Prioritize first 3 contacts
      });
    }
  }

  return contacts;
}