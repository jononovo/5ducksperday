import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface FunctionCallResult {
  type: 'conversation' | 'profile' | 'strategy';
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
            name: "generateProfile",
            description: "Generate a comprehensive product sales profile when the user has provided sufficient context about their product/service and target market",
            parameters: {
              type: "object",
              properties: {
                productName: {
                  type: "string",
                  description: "Name or type of product/service being sold"
                },
                keyFeatures: {
                  type: "array",
                  items: { type: "string" },
                  description: "Key features or benefits highlighted by user"
                },
                targetMarket: {
                  type: "string",
                  description: "Target market or customer type mentioned"
                }
              },
              required: ["productName", "keyFeatures", "targetMarket"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "generateStrategy",
            description: "Generate a 90-day email sales strategy after the product profile has been created",
            parameters: {
              type: "object",
              properties: {
                targetBusiness: {
                  type: "string",
                  description: "Specific type of business to target (e.g., 'business hotels in Mumbai')"
                },
                marketNiche: {
                  type: "string",
                  description: "Refined market niche for focused targeting"
                }
              },
              required: ["targetBusiness", "marketNiche"]
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