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
  const { emailPrompt, contact, company, userId, tone = 'default', offerStrategy = 'none', generateTemplate = false } = request;

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
      content: buildEmailPrompt({ 
        contact, 
        company, 
        userPrompt: emailPrompt, 
        senderNames,
        generateTemplate 
      })
    }
  ];

  const response = await queryPerplexity(messages);

  // Parse subject and content from AI response
  return parseEmailResponse(response);
}

function buildEmailPrompt(context: EmailGenerationContext): string {
  const { contact, company, userPrompt, senderNames, generateTemplate = false } = context;
  
  if (generateTemplate) {
    // Template generation for campaigns - use merge fields extensively
    return `Create an email template based on: ${userPrompt}

CRITICAL: Generate the actual email template directly. DO NOT include explanations or descriptions.

Required merge fields to use:
- {{first_name}} - Use this in greetings (e.g., "Hi {{first_name}},")
- {{company_name}} - Use when referencing the target company
- {{contact_role}} - Use when mentioning their position
- {{full_sender_name}} - Use in signature
- {{sender_first_name}} - Use in casual references to yourself

Optional merge fields you can also use:
- {{last_name}} - Target's last name
- {{contact_email}} - Their email
- {{personal_intro}} - For personalized introductions
- {{custom_proposal}} - For custom value propositions
- {{customer_pain-point}} - For addressing specific challenges

TEMPLATE CONTEXT:
Industry/Company Type: ${company.description || 'B2B companies'}
${contact && contact.role ? `Target Role: ${contact.role} (use {{contact_role}} in template)` : 'Various decision makers'}

FORMAT REQUIREMENTS (MUST FOLLOW EXACTLY):
1. Start with "Subject: " followed by an engaging subject line using merge fields
   Good examples:
   - Subject: Freshen Up {{company_name}} with Premium Commercial Orange Juicers
   - Subject: {{first_name}}, quick question about {{company_name}}'s operations
   - Subject: Transform {{company_name}}'s efficiency with our solution
   
2. Then on a new line, write the email body starting with the greeting
3. Use merge fields naturally throughout the email
4. DO NOT include any explanatory text or descriptions

CRITICAL INSTRUCTIONS:
- Create a reusable template that works for multiple recipients
- Use at least 4-5 different merge fields throughout the email
- Make the template feel personal despite being automated
- Start immediately with "Subject: " - no preamble or explanation`;
  }
  
  // Regular email generation - use actual values
  return `Write a business email based on this context:

Prompt: ${userPrompt}

Available merge fields for personalization:
- {{first_name}} - Target contact's first name
- {{contact_name}} - Target contact's full name  
- {{company_name}} - Target company name
- {{sender_first_name}} - Your first name
- {{full_sender_name}} - Your full name

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
- Use one of these merge fields like {{full_sender_name}} or {{sender_first_name}} in signatures when appropriate`;
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