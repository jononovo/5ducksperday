import { getOpenAIClient } from "../../ai-services";

export interface EmailGenerationParams {
  prompt: string;
  mergeFields: Record<string, string>;
  campaignName: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

/**
 * Generate email content using AI based on prompt and merge fields
 */
export async function generateEmailContent(params: EmailGenerationParams): Promise<GeneratedEmail> {
  const { prompt, mergeFields, campaignName } = params;

  // Replace merge fields in the prompt
  let processedPrompt = prompt;
  Object.entries(mergeFields).forEach(([key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    processedPrompt = processedPrompt.replace(pattern, value || '');
  });

  // Create system message for email generation
  const systemMessage = `You are an expert email copywriter. Generate a professional, engaging email based on the user's instructions.

Key requirements:
- Write in a conversational yet professional tone
- Keep the email concise and to the point
- Include a clear call-to-action
- Personalize using the provided information
- Do NOT include placeholder text like [Your Name] or [Company Name] at the end
- The email should be ready to send as-is

Return the response in JSON format with the following structure:
{
  "subject": "The email subject line",
  "body": "The complete email body in HTML format"
}`;

  const userMessage = `Campaign: ${campaignName}

Instructions: ${processedPrompt}

Recipient Information:
- First Name: ${mergeFields.first_name || 'there'}
- Last Name: ${mergeFields.last_name || ''}
- Company: ${mergeFields.contact_company_name || 'your company'}
- Email: ${mergeFields.contact_email}

Generate a personalized email following the instructions above. Make it engaging and relevant to the recipient.`;

  try {
    const openaiClient = getOpenAIClient();
    const completion = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error("No content generated");
    }

    const parsed = JSON.parse(response) as GeneratedEmail;
    
    // Ensure we have both subject and body
    if (!parsed.subject || !parsed.body) {
      throw new Error("Invalid response format from AI");
    }

    // Convert plain text to basic HTML if needed
    if (!parsed.body.includes('<')) {
      parsed.body = parsed.body
        .split('\n\n')
        .map(paragraph => `<p>${paragraph}</p>`)
        .join('\n');
    }

    return parsed;

  } catch (error) {
    console.error("[EmailGenerator] Error generating email:", error);
    
    // Fallback to a simple template
    return {
      subject: `Regarding ${campaignName}`,
      body: `<p>Hi ${mergeFields.first_name || 'there'},</p>
<p>${processedPrompt}</p>
<p>Best regards</p>`
    };
  }
}

/**
 * Generate a preview of an email for testing
 */
export async function generateEmailPreview(
  prompt: string,
  sampleMergeFields: Record<string, string>
): Promise<GeneratedEmail> {
  return generateEmailContent({
    prompt,
    mergeFields: sampleMergeFields,
    campaignName: "Preview"
  });
}