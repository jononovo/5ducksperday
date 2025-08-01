import { queryPerplexity } from "../lib/api/perplexity-client";
import type { PerplexityMessage } from "../lib/perplexity";
import type { EmailGenerationRequest, EmailGenerationResponse, EmailGenerationContext } from "./types";

/**
 * Email Content Generation Service
 * Handles AI-powered email generation using Perplexity API
 */

export async function generateEmailContent(request: EmailGenerationRequest): Promise<EmailGenerationResponse> {
  const { emailPrompt, contact, company } = request;

  // Construct the prompt for Perplexity
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a professional business email writer. Write personalized, engaging emails that are concise and effective. Focus on building genuine connections while maintaining professionalism."
    },
    {
      role: "user", 
      content: buildEmailPrompt({ contact, company, userPrompt: emailPrompt })
    }
  ];

  const response = await queryPerplexity(messages);

  // Parse subject and content from AI response
  return parseEmailResponse(response);
}

function buildEmailPrompt(context: EmailGenerationContext): string {
  const { contact, company, userPrompt } = context;
  
  return `Write a business email based on this context:

Prompt: ${userPrompt}

Company: ${company.name}
${company.size ? `Size: ${company.size} employees` : ''}
${company.services && Array.isArray(company.services) ? `Services: ${company.services.join(', ')}` : ''}

${contact ? `Recipient: ${contact.name}${contact.role ? ` (${contact.role})` : ''}` : 'No specific recipient selected'}

First, provide a short, engaging subject line prefixed with "Subject: ".
Then, on a new line, write the body of the email. Keep both subject and content concise and professional.`;
}

function parseEmailResponse(response: string): EmailGenerationResponse {
  // Split response into subject and content
  const parts = response.split('\n').filter(line => line.trim());
  const subjectLine = parts[0].replace(/^Subject:\s*/i, '').trim();
  const content = parts.slice(1).join('\n').trim();

  return {
    subject: subjectLine,
    content: content
  };
}