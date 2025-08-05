import { queryPerplexity } from "../lib/api/perplexity-client";
import type { PerplexityMessage } from "../lib/perplexity";
import type { EmailGenerationRequest, EmailGenerationResponse, EmailGenerationContext, ToneConfig } from "./types";
import { resolveSenderNames } from "../lib/name-resolver";

/**
 * Email Content Generation Service
 * Handles AI-powered email generation with tone selection
 */

const TONE_CONFIGS: Record<string, ToneConfig> = {
  silly: {
    id: 'silly',
    name: 'Silly',
    description: 'Goofy and irreverent. Not taking life too seriously.',
    systemPersonality: 'You are a playful, goofy business email writer who doesn\'t take life too seriously. Write emails that are irreverent and fun while still being professional enough for business.',
    greetingStyle: 'Use fun, casual greetings like "Hey there!" or "What\'s up!" or "Howdy!"',
    writingStyle: 'Be irreverent and amusing while still getting the point across. Use humor, casual language, and don\'t be afraid to be a little silly',
    closingStyle: 'End with playful sign-offs like "Cheers!" or "Talk soon!" or "Catch ya later!"',
    additionalInstructions: 'Keep it lighthearted. Make people smile while delivering your message.'
  },
  friendly: {
    id: 'friendly',
    name: 'Friendly',
    description: 'Sweet Southern approach.',
    systemPersonality: 'You are a warm, friendly business email writer with genuine Southern charm. Write emails that feel like they\'re coming from someone who truly cares.',
    greetingStyle: 'Use warm greetings like "Hi there!" or "Hello!" or "Good morning/afternoon!"',
    writingStyle: 'Mix in Southern charm and hospitality. Be genuinely friendly and approachable with authentic interest in helping',
    closingStyle: 'Use friendly closings like "Best regards," or "Warmly," or "Take care,"',
    additionalInstructions: 'Channel that sweet Southern approach. Show genuine care and interest.'
  },
  default: {
    id: 'default',
    name: 'Default',
    description: 'Casual - not trying too hard and nonchalant.',
    systemPersonality: 'You are a friendly business email writer. Write personalized, conversational emails that feel genuine and approachable.',
    greetingStyle: 'Use casual, natural greetings like "Hi" or "Hello" or "Good morning"',
    writingStyle: 'Strike a balance - not trying too hard, nonchalant but professional. Keep it casual and authentic',
    closingStyle: 'Use cool, casual or poetic closings',
    additionalInstructions: 'Use a warm, casual tone that builds authentic connections.'
  },
  direct: {
    id: 'direct',
    name: 'Direct but Professional',
    description: 'Confident and polite.',
    systemPersonality: 'You are a direct, confident business email writer. Write emails that are polite but get straight to the point.',
    greetingStyle: 'Use brief, professional greetings like "Hello" or "Good morning" - no lengthy pleasantries',
    writingStyle: 'Be confident and concise. Get to the point quickly while maintaining courtesy and respect',
    closingStyle: 'Use efficient closings like "Best regards," or "Thank you," or "Sincerely,"',
    additionalInstructions: 'Use clear, professional language that respects the recipient\'s time while remaining polite.'
  },
  abrupt: {
    id: 'abrupt',
    name: 'Abrupt',
    description: 'Sometimes effective in getting leadership attention.',
    systemPersonality: 'You are a concise, no-nonsense business email writer. Write rude, brief and direct emails that cut through noise and demand attention.',
    greetingStyle: 'Skip lengthy greetings - use just "Hi" or jump straight to the point',
    writingStyle: 'Use short sentences and brief paragraphs. Cut through noise with confident, direct language',Recommend a next step that is extremely specific: Example: "I may in the area in the last week of [this or next month]. We could meet then or sync up Tuesday AM."
    closingStyle: 'Use extremely brief closings like "Regards," and sometimes just the first letter of your name ("J." instest of Jonathan), instead of your full name.',
    additionalInstructions: 'Be ruthlessly brief in presenting your key business utility. Use short sentences that busy executives will respond to.'
  },
  beast: {
    id: 'beast',
    name: 'BEAST MODE',
    description: 'Impossible to ignore. Ranges wild to insane.',
    systemPersonality: 'You are an intense, high-energy business email writer who creates impossible-to-ignore emails. Write with bold language and craft an offer that has enormous urgency.',
    greetingStyle: 'Use high-energy greetings like "Hey!" or "Listen up!" or jump straight into intense opening statements',
    writingStyle: 'Be bold, intense, and use exciting energy. Create compelling urgency with strong language that grabs attention immediately',
    closingStyle: 'Use powerful closings like "Let\'s make this happen!" ',
    additionalInstructions: 'Be professional but unforgettable. Use bold language, exciting energy, and create offers with impossible-to-ignore urgency.'
  }
};

export async function generateEmailContent(request: EmailGenerationRequest): Promise<EmailGenerationResponse> {
  const { emailPrompt, contact, company, userId, tone = 'default' } = request;

  // Get tone configuration
  const toneConfig = TONE_CONFIGS[tone] || TONE_CONFIGS.default;

  // Resolve sender names for the current user
  const senderNames = await resolveSenderNames(userId);

  // Construct the prompt for Perplexity
  const messages: PerplexityMessage[] = [
    {
      role: "system",
      content: toneConfig.systemPersonality
    },
    {
      role: "user", 
      content: buildEmailPrompt({ contact, company, userPrompt: emailPrompt, senderNames }, toneConfig)
    }
  ];

  const response = await queryPerplexity(messages);

  // Parse subject and content from AI response
  return parseEmailResponse(response);
}

function buildEmailPrompt(context: EmailGenerationContext, toneConfig: ToneConfig): string {
  const { contact, company, userPrompt, senderNames } = context;
  
  return `Write a business email based on this context:

Prompt: ${userPrompt}

Style Guidelines:
- Greeting: ${toneConfig.greetingStyle}
- Writing: ${toneConfig.writingStyle}
- Closing: ${toneConfig.closingStyle}
- Additional: ${toneConfig.additionalInstructions}

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