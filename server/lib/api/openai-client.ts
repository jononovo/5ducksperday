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
            description: "Generate 90-day email sales strategy after product summary confirmation",
            parameters: {
              type: "object",
              properties: {
                targetMarket: {
                  type: "string",
                  description: "Specific target market refined through conversation"
                },
                productContext: {
                  type: "object",
                  description: "Product context from previous summary"
                }
              },
              required: ["targetMarket", "productContext"]
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

      if (functionName === 'generateProfile') {
        return {
          type: 'profile',
          message: "I'm creating your sales profile now.",
          data: {
            title: `${functionArgs.productName} Sales Profile`,
            markdown: generateProfileMarkdown(functionArgs),
            data: functionArgs
          }
        };
      } else if (functionName === 'generateStrategy') {
        return {
          type: 'strategy',
          message: "Now I'm building your 90-day email sales strategy.",
          data: {
            boundary: functionArgs.targetBusiness,
            sprintPrompt: `Weekly focus: Identify and engage with ${functionArgs.marketNiche} decision makers`,
            dailyQueries: generateDailyQueries(functionArgs.targetBusiness, functionArgs.marketNiche)
          }
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

function generateProfileMarkdown(args: any): string {
  return `## Key Features

${args.keyFeatures.map((feature: string) => `- **${feature}**: Enhances customer value and competitive advantage`).join('\n')}

### Selling Approaches

1. **Standard**: Emphasize core product benefits and ROI
2. **Innovation 1**: Highlight unique differentiators vs competitors  
3. **Innovation 2**: Focus on specific industry pain points
4. **Innovation 3**: Showcase measurable results and case studies`;
}

function generateDailyQueries(targetBusiness: string, marketNiche: string): string[] {
  return [
    `${targetBusiness} with 50-200 employees`,
    `${marketNiche} companies expanding operations`,
    `${targetBusiness} recently funded or growing`,
    `${marketNiche} decision makers LinkedIn active`,
    `${targetBusiness} attending industry conferences`,
    `${marketNiche} companies hiring ${targetBusiness} roles`,
    `${targetBusiness} with technology budget allocated`,
    `${marketNiche} companies facing operational challenges`
  ];
}