import { queryPerplexity } from "../lib/api/perplexity-client";
import type { PerplexityMessage } from "../lib/perplexity";
import type { EmailGenerationRequest, EmailGenerationResponse, EmailGenerationContext } from "./types";
import { resolveSenderNames } from "../lib/name-resolver";

/**
 * Email Content Generation Service
 * Handles AI-powered email generation using Perplexity API
 */

export async function generateEmailContent(request: EmailGenerationRequest): Promise<EmailGenerationResponse> {
  const { emailPrompt, contact, company, userId } = request;

  // Resolve sender names for the current user
  const senderNames = await resolveSenderNames(userId);

  // Construct the prompt for Perplexity
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: "You are a friendly business email writer. Write personalized, conversational emails that feel genuine and approachable while remaining business-appropriate. Use a warm, casual tone that builds authentic connections."
    },
    {
      role: "user", 
      content: buildEmailPrompt({ contact, company, userPrompt: emailPrompt, senderNames })
    }
  ];

  const response = await queryPerplexity(messages);

  // Parse subject and content from AI response
  return parseEmailResponse(response);
}

function buildEmailPrompt(context: EmailGenerationContext): string {
  const { contact, company, userPrompt, senderNames } = context;
  
  return `Write a business email based on this context:

Prompt: ${userPrompt}

Available merge fields for personalization:
- {{first_name}} - Contact's first name
- {{contact_name}} - Contact's full name  
- {{company_name}} - Contact's company name
- {{sender_first_name}} - Your first name: "${senderNames?.firstName || 'User'}"
- {{sender_name}} - Your full name: "${senderNames?.fullName || 'User'}"

Company: ${company.name}
${company.description ? `About: ${company.description}` : ''}

${contact ? `Recipient: ${contact.name}${contact.role ? ` (${contact.role})` : ''}` : 'No specific recipient selected'}

First, provide a short, engaging subject line prefixed with "Subject: ".
Then, on a new line, write the body of the email. 
 - Keep both subject and content concise.
 - Add generous white space between paragraphs (use double line breaks)
 - Add extra line spacing after the signature.
 - Use merge fields like {{sender_name}} or {{sender_first_name}} in signatures when appropriate.`;
}

function parseEmailResponse(response: string): EmailGenerationResponse {
  // Split response into subject and content, preserving spacing
  const lines = response.split('\n');
  const subjectLine = lines[0].replace(/^Subject:\s*/i, '').trim();
  const content = lines.slice(1).join('\n').trim();

  return {
    subject: subjectLine,
    content: content
  };
}