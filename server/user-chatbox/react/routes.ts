/**
 * React Strategy Chat Routes
 * These endpoints support the React strategy chat overlay
 */

import { Express } from "express";
import { storage } from "../../storage";
import { queryPerplexity } from "../../lib/api/perplexity-client";
import { 
  queryOpenAI,
  generateEmailStrategy, 
  generateBoundary, 
  generateBoundaryOptions, 
  generateSprintPrompt, 
  generateDailyQueries,
  generateProductOffers
} from "../../lib/api/openai-client";
import type { PerplexityMessage } from "../../lib/perplexity";

// Helper function to safely get user ID from request
function getUserId(req: any): number {
  try {
    // First check if user is authenticated through session
    if (req.isAuthenticated && req.isAuthenticated() && req.user && req.user.id) {
      return req.user.id;
    }
    
    // Then check for Firebase authentication
    if (req.firebaseUser && req.firebaseUser.id) {
      return req.firebaseUser.id;
    }
  } catch (error) {
    console.error('Error accessing user ID:', error);
  }
  
  // For non-authenticated users, fall back to demo user ID (1)
  return 1;
}

export function registerReactChatRoutes(app: Express, requireAuth: any) {
  
  // Three-Report Strategy Chat with OpenAI + Perplexity
  app.post("/api/onboarding/strategy-chat", async (req, res) => {
    try {
      const { userInput, productContext, conversationHistory } = req.body;

      if (!userInput || !productContext) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      console.log('Processing strategy chat with input:', userInput);
      console.log('Conversation history received:', JSON.stringify(conversationHistory, null, 2));

      // Determine conversation phase based on conversation content
      const hasProductSummary = conversationHistory?.some((msg: any) => 
        msg.sender === 'ai' && 
        msg.content && (
          msg.content.toLowerCase().includes('product analysis summary') ||
          msg.content.toLowerCase().includes('here\'s your product analysis') ||
          msg.content.toLowerCase().includes('here is your product analysis') ||
          (msg.content.toLowerCase().includes('product') && msg.content.toLowerCase().includes('summary'))
        )
      ) || false;
      const hasEmailStrategy = conversationHistory?.some((msg: any) => 
        msg.sender === 'ai' && 
        (msg.content?.includes('90-day email sales strategy') || msg.content?.includes('EMAIL STRATEGY'))
      ) || false;
      const hasSalesApproach = conversationHistory?.some((msg: any) => 
        msg.sender === 'ai' && 
        msg.content?.includes('Sales Approach Strategy')
      ) || false;
      
      // Track target market collection phases
      const targetMessages = conversationHistory?.filter((msg: any) => 
        msg.sender === 'user' && 
        msg.content && 
        !msg.content.toLowerCase().includes('generate product summary') &&
        !msg.content.toLowerCase().includes('yes please') &&
        !msg.content.toLowerCase().includes('correct') &&
        !msg.content.toLowerCase().includes('ok') &&
        msg.content.length > 3
      ) || [];
      
      const hasInitialTarget = targetMessages.length >= 1;
      
      // Check if current input should count as refined target
      const isCurrentInputTarget = userInput && 
        !userInput.toLowerCase().includes('generate product summary') &&
        !userInput.toLowerCase().includes('yes please') &&
        !userInput.toLowerCase().includes('correct') &&
        !userInput.toLowerCase().includes('ok') &&
        userInput.length > 3;
      
      const hasRefinedTarget = targetMessages.length >= 2;

      let currentPhase = 'PRODUCT_SUMMARY';
      if (hasProductSummary && !hasInitialTarget) currentPhase = 'TARGET_COLLECTION';
      if (hasProductSummary && hasInitialTarget && !hasRefinedTarget) currentPhase = 'TARGET_REFINEMENT';
      if (hasProductSummary && hasRefinedTarget && !hasEmailStrategy) currentPhase = 'EMAIL_STRATEGY';
      if (hasEmailStrategy && !hasSalesApproach) currentPhase = 'SALES_APPROACH';
      if (hasSalesApproach) currentPhase = 'COMPLETE';

      console.log('Phase detection debug:', {
        hasProductSummary,
        hasInitialTarget,
        hasRefinedTarget,
        hasEmailStrategy,
        currentPhase,
        targetMessagesCount: targetMessages.length,
        conversationHistory: conversationHistory?.map((m: any) => ({ sender: m.sender, contentStart: m.content?.substring(0, 50) }))
      });

      // Build conversation messages for OpenAI
      const messages = [
        {
          role: "system",
          content: `You are a strategic onboarding assistant managing a 3-report generation process.

PRODUCT CONTEXT:
- Product/Service: ${productContext.productService}
- Customer Feedback: ${productContext.customerFeedback}
- Website: ${productContext.website || 'Not provided'}

REPORT SEQUENCE:
1. Product Summary (immediate) → Ask for target business example
2. Target Collection → Ask for refinement/specificity  
3. Email Strategy (after both targets) → Ask "Does this align?"
4. Sales Approach (final) → State "All information available in dashboard"

CURRENT PHASE: ${currentPhase}

TARGET COLLECTION PHASE RULES:
- After Product Summary, ask for target business examples using: "[type of business] in [city/niche]"
- After first target example, analyze for Geographic (country → city/region) and Niche (industry → sub-industry) specificity gaps, then ask for refinement using template: "Is there an additional niche or another example that you think could improve your sales chances? Like, instead of 'family-friendly hotels in orlando' We could add '4-star' to make it '4-star family-friendly hotels in orlando'" or encourage to swap either state or country to city or large city section
- Only call generateEmailStrategy() after collecting BOTH initial target and refined target

PHASE-SPECIFIC INSTRUCTIONS:
- TARGET_COLLECTION: Ask for business type examples, provide format guidance
- TARGET_REFINEMENT: Ask for specificity improvement using template above
- EMAIL_STRATEGY: Call generateEmailStrategy with both initialTarget and refinedTarget
- Keep responses under 15 words between reports
- ALWAYS end initial response with: "Give me 5 seconds. I'm building a product summary so I can understand what you're selling."`
        }
      ];

      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach((msg: any) => {
          if (msg.sender && msg.content) {
            messages.push({
              role: msg.sender === 'user' ? 'user' : 'assistant',
              content: msg.content
            } as any);
          }
        });
      }

      // Add current user input
      messages.push({
        role: "user",
        content: userInput
      } as any);

      // Special handling for EMAIL_STRATEGY phase - trigger progressive generation flag
      let result: any;
      console.log('Checking progressive strategy trigger:', { 
        currentPhase, 
        hasRefinedTarget, 
        shouldTrigger: currentPhase === 'EMAIL_STRATEGY' && hasRefinedTarget 
      });
      
      if (currentPhase === 'EMAIL_STRATEGY' && hasRefinedTarget && userInput !== 'Generate sales approach' && userInput !== 'Generate product offers') {
        const initialTarget = targetMessages[0]?.content || '';
        const refinedTarget = isCurrentInputTarget ? userInput : (targetMessages[1]?.content || '');
        
        console.log('Triggering progressive email strategy with targets:', { initialTarget, refinedTarget });
        
        result = {
          type: 'progressive_strategy',
          message: "Perfect! Now I'll create your **strategic sales plan** step by step.",
          initialTarget,
          refinedTarget,
          needsProgressiveGeneration: true
        };
        
        console.log('Progressive strategy result object:', result);
      } else if (userInput === 'Generate product offers') {
        // Handle product offers generation specifically
        console.log('Handling product offers generation directly');
        
        try {
          const { generateAllProductOffers } = await import('../../lib/api/openai-client.js');
          
          // Get sales approach context from conversation history
          const salesApproachMessage = conversationHistory?.find((msg: any) => 
            msg.sender === 'ai' && msg.content?.includes('Sales Approach Strategy')
          );
          const salesContext = salesApproachMessage?.content || 'sales approach context';
          
          const offers = await generateAllProductOffers(productContext, salesContext, conversationHistory);
          
          // Format offers for display
          const offersContent = offers.map((offer: any) => 
            `### ${offer.title}\n${offer.content}`
          ).join('\n\n');
          
          result = {
            type: 'product_offers',
            message: "🎯 Product Offer Strategies",
            data: {
              title: "Product Offer Strategies", 
              content: `## Product Offer Strategies\n\n${offersContent}`,
              offers: offers
            }
          };
        } catch (error) {
          console.error('Product offers generation error:', error);
          result = {
            type: 'conversation',
            message: "I encountered an issue generating your product offers. Let me try a different approach."
          };
        }
      } else if (userInput === 'Generate sales approach') {
        // Handle sales approach generation specifically
        console.log('Handling sales approach generation directly');
        
        try {
          // Use OpenAI for sales approach generation for consistency
          const openaiPrompt = `
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

          // Use OpenAI directly for consistency with the overall system
          const OpenAI = await import('openai');
          const openaiClient = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
          
          const response = await openaiClient.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: "You are a sales strategy expert. Create structured, high-level email approach guidance." },
              { role: "user", content: openaiPrompt }
            ],
            temperature: 0.7
          });

          const content = response.choices[0]?.message?.content || '';
          
          const salesApproachData = {
            title: "Sales Approach Strategy",
            content: content,
            timestamp: new Date().toISOString()
          };

          result = {
            type: 'sales_approach',
            message: "📬 Sales Approach Strategy",
            data: salesApproachData
          };
        } catch (error) {
          console.error('Sales approach generation error:', error);
          result = {
            type: 'conversation',
            message: "I encountered an issue generating your sales approach. Let me try a different approach."
          };
        }
      } else {
        // Normal conversation flow using OpenAI with function calling
        result = await queryOpenAI(messages, productContext);
      }

      // Save to database if user is authenticated
      if (req.user) {
        try {
          const userId = getUserId(req);
          const existingProfiles = await storage.getStrategicProfiles(userId);
          
          // Find or create in-progress profile
          let matchingProfile = existingProfiles.find(profile => 
            profile.status === 'in_progress'
          );
          
          if (!matchingProfile) {
            // Create new in-progress profile
            matchingProfile = await storage.createStrategicProfile({
              userId,
              title: productContext.productService || 'Strategy Plan',
              businessType: 'product',
              businessDescription: productContext.productService || '',
              targetCustomers: '',
              productService: productContext.productService,
              customerFeedback: productContext.customerFeedback,
              website: productContext.website,
              status: 'in_progress'
            });
          }
          
          // Save report content based on type
          if (result.type === 'product_summary' && result.data) {
            await storage.updateStrategicProfile(matchingProfile.id, { 
              productAnalysisSummary: JSON.stringify(result.data) 
            });
          } else if (result.type === 'email_strategy' && result.data) {
            await storage.updateStrategicProfile(matchingProfile.id, { 
              reportSalesTargetingGuidance: JSON.stringify(result.data) 
            });
          } else if (result.type === 'sales_approach' && result.data) {
            await storage.updateStrategicProfile(matchingProfile.id, { 
              reportSalesContextGuidance: JSON.stringify(result.data) 
            });
          } else if (result.type === 'product_offers' && result.data) {
            await storage.updateStrategicProfile(matchingProfile.id, { 
              productOfferStrategies: JSON.stringify(result.data) 
            });
          }
        } catch (dbError) {
          console.warn('Failed to save report to database:', dbError);
        }
      }

      // Return structured response
      const response: any = {
        type: result.type,
        message: result.message,
        phase: currentPhase
      };
      
      // Include data if present
      if (result.data) {
        response.data = result.data;
      }
      
      // Include additional properties for progressive strategy
      if (result.type === 'progressive_strategy') {
        response.initialTarget = result.initialTarget;
        response.refinedTarget = result.refinedTarget;
        response.needsProgressiveGeneration = result.needsProgressiveGeneration;
      }
      
      res.json(response);

    } catch (error) {
      console.error("Strategy chat error:", error);
      res.json({ 
        type: 'conversation', 
        response: "I apologize for the technical issue. Let me help you create your sales strategy."
      });
    }
  });

  // Progressive Strategy Generation Endpoints
  app.post("/api/strategy/boundary", async (req, res) => {
    try {
      const { initialTarget, refinedTarget, productContext } = req.body;

      if (!initialTarget || !refinedTarget || !productContext) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      const boundaryOptions = await generateBoundaryOptions({ initialTarget, refinedTarget }, productContext);
      
      res.json({
        type: 'boundary_options',
        title: 'Target Boundary Options',
        content: boundaryOptions,
        step: 1,
        totalSteps: 3,
        needsSelection: true,
        description: "This will target ~700 companies across 6 sprints. Please choose your preferred approach:"
      });

    } catch (error) {
      console.error("Boundary generation error:", error);
      res.status(500).json({
        message: "Failed to generate target boundary options"
      });
    }
  });

  app.post("/api/strategy/boundary/confirm", async (req, res) => {
    try {
      const { selectedOption, customBoundary, productContext } = req.body;

      if (!productContext) {
        res.status(400).json({ message: "Product context is required" });
        return;
      }

      if (!selectedOption && !customBoundary) {
        res.status(400).json({ message: "Either selectedOption or customBoundary must be provided" });
        return;
      }

      let finalBoundary = customBoundary || selectedOption;

      // If user provided custom boundary, validate it with AI
      if (customBoundary) {
        const validationPrompt = `
Analyze this user-provided boundary for ${productContext.productService}: "${customBoundary}"

Validate if this boundary can realistically target ~700 companies across 6 sprints. If it needs improvement, suggest a refined version. If it's good as-is, return it unchanged.

Max 10 words for the final boundary.
Return only the final boundary statement, no additional text.`;

        try {
          const refinedBoundary = await queryPerplexity([
            { role: "system", content: "You are a market strategy expert. Validate and refine target boundaries for sales campaigns." } as PerplexityMessage,
            { role: "user", content: validationPrompt } as PerplexityMessage
          ]);
          finalBoundary = refinedBoundary.trim();
        } catch (error) {
          console.warn('Failed to validate custom boundary, using as-is:', error);
          finalBoundary = customBoundary;
        }
      }

      // Save boundary to database if user is authenticated
      if (req.user) {
        try {
          const userId = getUserId(req);
          const existingProfiles = await storage.getStrategicProfiles(userId);
          
          const matchingProfile = existingProfiles.find(profile => 
            profile.status === 'in_progress'
          );
          
          if (matchingProfile) {
            await storage.updateStrategicProfile(matchingProfile.id, { 
              strategyHighLevelBoundary: finalBoundary
            });
          }
        } catch (dbError) {
          console.warn('Failed to save boundary to database:', dbError);
        }
      }

      res.json({
        type: 'boundary_confirmed',
        title: 'Target Boundary Confirmed',
        content: finalBoundary,
        step: 1,
        totalSteps: 3,
        isConfirmed: true
      });

    } catch (error) {
      console.error("Boundary confirmation error:", error);
      res.status(500).json({
        message: "Failed to confirm target boundary"
      });
    }
  });

  app.post("/api/strategy/sprint", async (req, res) => {
    try {
      const { boundary, refinedTarget, productContext } = req.body;

      if (!boundary || !refinedTarget || !productContext) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      const sprintPrompt = await generateSprintPrompt(boundary, { refinedTarget }, productContext);
      
      // Save sprint prompt to database if user is authenticated
      if (req.user) {
        try {
          const userId = getUserId(req);
          const existingProfiles = await storage.getStrategicProfiles(userId);
          
          const matchingProfile = existingProfiles.find(profile => 
            profile.status === 'in_progress'
          );
          
          if (matchingProfile) {
            await storage.updateStrategicProfile(matchingProfile.id, { 
              exampleSprintPlanningPrompt: sprintPrompt
            });
          }
        } catch (dbError) {
          console.warn('Failed to save sprint prompt to database:', dbError);
        }
      }

      res.json({
        type: 'sprint',
        title: 'Sprint Strategy',
        content: sprintPrompt,
        step: 2,
        totalSteps: 3
      });

    } catch (error) {
      console.error("Sprint generation error:", error);
      res.status(500).json({
        message: "Failed to generate sprint strategy"
      });
    }
  });

  app.post("/api/strategy/queries", async (req, res) => {
    try {
      const { boundary, sprintPrompt, productContext } = req.body;

      if (!boundary || !sprintPrompt || !productContext) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      const dailyQueries = await generateDailyQueries(boundary, sprintPrompt, productContext);
      
      // Save daily queries and complete strategy to database if user is authenticated
      if (req.user) {
        try {
          const userId = getUserId(req);
          const existingProfiles = await storage.getStrategicProfiles(userId);
          
          const matchingProfile = existingProfiles.find(profile => 
            profile.status === 'in_progress'
          );
          
          if (matchingProfile) {
            // Format complete strategy report
            const fullStrategy = {
              title: "90-Day Email Strategy",
              boundary,
              sprintPrompt,
              dailyQueries,
              content: `## 1. TARGET BOUNDARY\n${boundary}\n\n## 2. SPRINT PROMPT\n${sprintPrompt}\n\n## 3. DAILY QUERIES\n${dailyQueries.join('\n')}`
            };
            
            await storage.updateStrategicProfile(matchingProfile.id, { 
              dailySearchQueries: JSON.stringify(dailyQueries),
              reportSalesTargetingGuidance: JSON.stringify(fullStrategy)
            });
          }
        } catch (dbError) {
          console.warn('Failed to save queries to database:', dbError);
        }
      }

      res.json({
        type: 'queries',
        title: 'Daily Search Queries',
        content: dailyQueries,
        step: 3,
        totalSteps: 3,
        isComplete: true
      });

    } catch (error) {
      console.error("Queries generation error:", error);
      res.status(500).json({
        message: "Failed to generate daily queries"
      });
    }
  });

  // Strategy Processing Endpoint for Cold Email Outreach
  app.post("/api/onboarding/process-strategy", async (req, res) => {
    try {
      const { businessType, formData } = req.body;

      if (!businessType || !formData || !formData.targetDescription) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      console.log(`Processing strategy for ${businessType}:`, formData);

      // Construct strategy processing prompt for Perplexity API
      const strategyPrompt = `Analyze this ${businessType} business profile and target market description to create a cold email outreach strategy:

**Business Profile:**
Product/Service: ${formData.productService}
Customer Feedback: ${formData.customerFeedback}
Website: ${formData.website || 'Not provided'}
Target Market Description: ${formData.targetDescription}

**Required Analysis:**
Extract and provide the following strategy components for cold email outreach:

1. **Strategy High-Level Boundary** - A precise target market definition (e.g., "3-4 star family-friendly hotels in coastal towns in southeast US")

2. **Example Sprint Planning Prompt** - A medium-level search prompt for weekly planning (e.g., "family-friendly hotels on space coast, florida")

3. **Example Daily Search Query** - A specific daily search query for finding 15-20 contacts (e.g., "family-friendly hotels in cocoa beach")

4. **Sales Context Guidance** - Strategic advice for cold email approach specific to this target market

5. **Sales Targeting Guidance** - Specific recommendations for identifying and reaching decision makers in this market

Respond in this exact JSON format:
{
  "strategyHighLevelBoundary": "precise target market definition",
  "exampleSprintPlanningPrompt": "medium-level search prompt",
  "exampleDailySearchQuery": "specific daily search query",
  "reportSalesContextGuidance": "strategic cold email advice",
  "reportSalesTargetingGuidance": "decision maker targeting recommendations"
}`;

      const strategyMessages: PerplexityMessage[] = [
        {
          role: "system",
          content: "You are a cold email outreach strategist. Analyze business profiles and create precise targeting strategies for B2B cold email campaigns. Always respond with valid JSON in the exact format requested."
        },
        {
          role: "user", 
          content: strategyPrompt
        }
      ];

      // Get strategy analysis from Perplexity
      const strategyResponse = await queryPerplexity(strategyMessages);

      // Parse JSON response
      let strategyData;
      try {
        // Extract JSON from response if it contains other text
        const jsonMatch = strategyResponse.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : strategyResponse;
        strategyData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Failed to parse strategy JSON:", parseError);
        // Fallback to basic strategy data
        strategyData = {
          strategyHighLevelBoundary: formData.targetDescription,
          exampleSprintPlanningPrompt: `${formData.targetDescription} in specific regions`,
          exampleDailySearchQuery: `${formData.targetDescription} in [city name]`,
          reportSalesContextGuidance: `Focus on cold email outreach to ${formData.targetDescription} emphasizing ${formData.customerFeedback}`,
          reportSalesTargetingGuidance: `Target decision makers at ${formData.targetDescription} using ${formData.primarySalesChannel || 'strategic'} insights`
        };
      }

      console.log('Strategy processing completed successfully');

      res.json(strategyData);

    } catch (error: any) {
      console.error("Strategy processing error:", error);
      res.status(500).json({
        message: "Failed to process strategy",
        error: error.message
      });
    }
  });
}