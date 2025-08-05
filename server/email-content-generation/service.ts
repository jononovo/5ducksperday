import { queryPerplexity } from "../lib/api/perplexity-client";
import type { PerplexityMessage } from "../lib/perplexity";
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

  console.log('🔍 SERVICE DIAGNOSTICS:', {
    receivedOfferStrategy: offerStrategy,
    receivedTone: tone,
    hasContact: !!contact,
    companyName: company?.name
  });

  // Resolve sender names for the current user
  const senderNames = await resolveSenderNames(userId);
  
  // Get tone configuration
  const toneConfig = getToneConfig(tone);
  
  // Get offer strategy configuration (can be null)
  const offerConfig = getOfferConfig(offerStrategy);
  
  console.log('🔍 CONFIG DIAGNOSTICS:', {
    toneConfigFound: !!toneConfig,
    offerConfigFound: !!offerConfig,
    offerConfigId: offerConfig?.id,
    offerConfigName: offerConfig?.name
  });

  // Build system prompt with tone and optional offer strategy
  let systemContent = `${toneConfig.systemPersonality}.

GREETING INSTRUCTIONS: ${toneConfig.greetingStyle}
WRITING STYLE: ${toneConfig.writingStyle}
CLOSING INSTRUCTIONS: ${toneConfig.closingStyle}

${toneConfig.additionalInstructions}`;

  // Add offer strategy instructions only if not 'none'
  if (offerConfig) {
    systemContent += `

SUBJECT LINE STRATEGY: ${offerConfig.subjectInstructions}
OFFER STRUCTURE: ${offerConfig.actionableStructure}`;
    
    // Add fallback suggestions if available
    if (offerConfig.fallbackSuggestions) {
      systemContent += `
FALLBACK OPTIONS: ${offerConfig.fallbackSuggestions}`;
    }
    
    console.log('🔍 OFFER STRATEGY ADDED:', {
      strategyId: offerConfig.id,
      hasSubjectInstructions: !!offerConfig.subjectInstructions,
      hasFallbackSuggestions: !!offerConfig.fallbackSuggestions,
      actionableStructureLength: offerConfig.actionableStructure.length
    });
  } else {
    console.log('🔍 NO OFFER STRATEGY: offerConfig is null/undefined');
  }

  // Log the complete system prompt being sent to AI
  console.log('🔍 COMPLETE SYSTEM PROMPT:', {
    promptLength: systemContent.length,
    hasOfferStrategy: systemContent.includes('OFFER STRUCTURE:'),
    hasSubjectStrategy: systemContent.includes('SUBJECT LINE STRATEGY:'),
    hasFallbackOptions: systemContent.includes('FALLBACK OPTIONS:')
  });
  
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
- Use merge fields like {{sender_name}} or {{sender_first_name}} in signatures when appropriate`;
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