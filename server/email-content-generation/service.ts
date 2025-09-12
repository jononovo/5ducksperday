import { queryPerplexity } from "../search/perplexity/perplexity-client";
import type { PerplexityMessage } from "../search/perplexity/perplexity-types";
import type { EmailGenerationRequest, EmailGenerationResponse, EmailGenerationContext } from "./types";
import { resolveSenderNames } from "../lib/name-resolver";
import { getToneConfig } from "./tone-configs";
import { getOfferConfig } from "./offer-configs";

/**
 * Email Content Generation Service
 * Handles AI-powered email generation with tone selection
 */

export async function generateEmailContent(request: EmailGenerationRequest): Promise<EmailGenerationResponse> {
  const { emailPrompt, contact, company, userId, tone = 'default', offerStrategy = 'none' } = request;

  // Resolve sender names for the current user
  const senderNames = await resolveSenderNames(userId);
  
  // Get tone configuration
  const toneConfig = getToneConfig(tone);
  
  // Get offer strategy configuration (can be null)
  const offerConfig = getOfferConfig(offerStrategy);

  // Build integrated writing style with optional offer strategy
  let writingStyle = toneConfig.writingStyle;
  if (offerConfig) {
    writingStyle += ` When presenting your value proposition, ${offerConfig.actionableStructure}`;
  }

  // Build system prompt with integrated instructions
  let systemContent = `${toneConfig.systemPersonality}.

GREETING INSTRUCTIONS: ${toneConfig.greetingStyle}
WRITING STYLE: ${writingStyle}
CLOSING INSTRUCTIONS: ${toneConfig.closingStyle}

${toneConfig.additionalInstructions}`;

  // Construct the prompt for Perplexity
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: systemContent
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
- {{first_name}} - Target contact's first name
- {{contact_name}} - Target contact's full name  
- {{company_name}} - Target company name
- {{sender_first_name}} - Your first name: "${senderNames?.firstName || 'User'}"
- {{sender_name}} - Your full name: "${senderNames?.fullName || 'User'}"

TARGET COMPANY: ${company.name}
${company.description ? `About: ${company.description}` : ''}

${contact ? `TARGET CONTACT: ${contact.name}${contact.role ? ` (${contact.role})` : ''}` : 'No specific target contact selected'}

Structure your email with:
1. An engaging greeting following the greeting style instructions
2. Email body following the writing style instructions  
3. A memorable closing following the closing style instructions

Format requirements:
- First, provide a short, engaging subject line prefixed with "Subject: "
- Then, on a new line, write the body of the email
- Keep both subject and content concise
- Add generous white space between paragraphs (use double line breaks)
- Add extra line spacing after the signature
- Use one of these merge fields for the signature:
  For full name use {{sender_name}} . 
  For first name use {{sender_first_name}} .`;
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