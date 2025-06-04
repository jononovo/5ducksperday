import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { queryPerplexity } from './perplexity-client';
import type { PerplexityMessage } from '../perplexity';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface FunctionCallResult {
  type: 'conversation' | 'product_summary' | 'email_strategy' | 'sales_approach';
  message: string;
  data?: any;
}

// Perplexity-powered report generation functions
async function generateProductSummary(params: any, productContext: any): Promise<any> {
  const productData = params.productData || productContext;
  
  if (!productData || !productData.productService) {
    throw new Error('Product data is required for summary generation');
  }
  
  const perplexityPrompt = `
Analyze this product and create a concise summary (max 200 words, bullet points):

Product: ${productData.productService}
Customer Feedback: ${productData.customerFeedback || 'Not provided'}
Website: ${productData.website || 'Not provided'}

Required structure:
• **What it is**: [Product description]
• **Problem it solves**: [Customer pain point]  
• **Competitive advantage**: [Why superior]
• **Customer benefit**: [Selling approach advantage]

Focus on differentiation and value. Maximum 200 words.`;

  const result = await queryPerplexity([
    { role: "system", content: "You are a product analyst. Create concise, bullet-pointed summaries focused on competitive advantage." },
    { role: "user", content: perplexityPrompt }
  ]);

  return {
    title: "Product Analysis Summary",
    content: result,
    wordCount: result.split(' ').length
  };
}

export async function generateEmailStrategy(params: any, productContext: any): Promise<any> {
  const { initialTarget, refinedTarget } = params;
  const productData = productContext;
  
  const perplexityPrompt = `
Create a 90-day email sales strategy for ${productContext.productService}:
Example Daily Search Query: ${initialTarget}

Format exactly as:
## 1. TARGET BOUNDARY
Based on product and example customers in ${initialTarget}, create a 90-day search boundary ( ~700 companies) statement that we can build 6 search sprints ( 2 weeks each) within. 
Boundary can be niches and/or geographic areas.
Max 10 words.

Examples:
mid-level rated, irish bars in NY state
franchsing educational tutoring companies in South America.
FinTech companies in India

## 2. SPRINT PROMPT  
Find 8-10 daily search prompts worth of ${refinedTarget} leads this week

EXAMPLE SPRINT PROMPT: 
Segments a part of the 90-Day target boundary, in order to generate a 8 "daily search queries" that will each result in 7-10 companies.

## 3. DAILY QUERIES
1. [specific search prompt]
2. [specific search prompt]
3. [specific search prompt]
4. [specific search prompt]
5. [specific search prompt]
6. [specific search prompt]
7. [specific search prompt]
8. [specific search prompt]
Keep concise. No introductions or extra sections. no bullets.`;

  const result = await queryPerplexity([
    { role: "system", content: "You are an email sales strategy expert. Research current best practices and provide structured output." },
    { role: "user", content: perplexityPrompt }
  ]);

  return {
    title: "90-Day Email Strategy", 
    boundary: refinedTarget,
    sprintPrompt: `Weekly focus: Identify and engage with ${refinedTarget} decision makers`,
    content: result
  };
}

async function generateSalesApproach(params: any, productContext: any): Promise<any> {
  const { strategyContext } = params;
  const productData = productContext;
  
  const perplexityPrompt = `
Create a strategic email approach guide (max 200 words) for ${productContext.productService}.

Format exactly as:

**RELATIONSHIP INITIATION APPROACHES:**
• **Standard**: [Traditional approach]
• **Innovation 1**: [Creative method]
• **Innovation 2**: [Unique technique] 
• **Innovation 3**: [Unconventional strategy]

**SUBJECT LINE FORMATS:**
• **Standard**: [Professional format]
• **Innovation 1**: [Curiosity approach]
• **Innovation 2**: [Value-focused technique]
• **Innovation 3**: [Personalized format]

High-level strategic guidance for email generation.`;

  const result = await queryPerplexity([
    { role: "system", content: "You are a sales strategy expert. Create structured, high-level email approach guidance." },
    { role: "user", content: perplexityPrompt }
  ]);

  return {
    title: "Sales Approach Strategy",
    content: result,
    sections: {
      approaches: "4 relationship initiation methods",
      subjectLines: "4 subject line formats"
    }
  };
}

export async function queryOpenAI(
  messages: ChatCompletionMessageParam[],
  productContext: any
): Promise<FunctionCallResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "generateProductSummary",
            description: "Generate product analysis summary from form data - call immediately when chat opens",
            parameters: {
              type: "object",
              properties: {
                productData: {
                  type: "object",
                  description: "Product information from form inputs"
                }
              },
              required: ["productData"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "generateEmailStrategy",
            description: "Generate 90-day email sales strategy after collecting both initial target and refinement",
            parameters: {
              type: "object",
              properties: {
                initialTarget: {
                  type: "string",
                  description: "Initial target market example from user"
                },
                refinedTarget: {
                  type: "string", 
                  description: "Refined target market with additional specificity"
                },
                productContext: {
                  type: "object",
                  description: "Product context from previous summary"
                }
              },
              required: ["initialTarget", "refinedTarget", "productContext"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "generateSalesApproach",
            description: "Generate sales approach strategy for email content - final report",
            parameters: {
              type: "object",
              properties: {
                strategyContext: {
                  type: "object",
                  description: "Context from email strategy"
                },
                productContext: {
                  type: "object",
                  description: "Product context"
                }
              },
              required: ["strategyContext", "productContext"]
            }
          }
        }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    const assistantMessage = response.choices[0].message;

    // Handle function calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      if (functionName === 'generateProductSummary') {
        const summary = await generateProductSummary(functionArgs, productContext);
        return {
          type: 'product_summary',
          message: "Here's your product analysis summary:",
          data: summary
        };
      } else if (functionName === 'generateEmailStrategy') {
        const strategy = await generateEmailStrategy(functionArgs, productContext);
        return {
          type: 'email_strategy', 
          message: "Here's your 90-day email sales strategy:",
          data: strategy
        };
      } else if (functionName === 'generateSalesApproach') {
        const approach = await generateSalesApproach(functionArgs, productContext);
        return {
          type: 'sales_approach',
          message: "Here's your sales approach strategy:",
          data: approach
        };
      }
    }

    // Regular conversation response
    return {
      type: 'conversation',
      message: assistantMessage.content || "I need more information to help you."
    };

  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}