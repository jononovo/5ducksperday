/**
 * @deprecated HTML Static Chat Routes
 * These endpoints support the legacy HTML landing page at '/'
 * New development should use the React version in ../react/
 */

import { Express } from "express";
import { storage } from "../../storage";
import { queryPerplexity } from "../../lib/api/perplexity-client";
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

// Helper functions for extracting profile data
function extractAttributes(message: string): string[] {
  // Simple implementation - could be enhanced later
  return message.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function extractMarketNiche(message: string): string {
  // Simple implementation - could be enhanced later
  return message.toLowerCase().includes('niche') ? 'niche' : 'broad';
}

function generateSearchPrompts(profileData: any, businessType: string): string[] {
  // Simple implementation - could be enhanced later
  return [
    `${businessType} for ${profileData.targetCustomers || 'businesses'}`,
    `${profileData.businessDescription || businessType} solutions`,
    `Find ${profileData.targetCustomers || 'customers'} who need ${businessType}`
  ];
}

export function registerHtmlStaticChatRoutes(app: Express) {
  
  // Strategic Onboarding Chat Endpoint (DEPRECATED - HTML Landing Page Version)
  app.post("/api/onboarding/chat", async (req, res) => {
    try {
      const { message, businessType, currentStep, profileData, conversationHistory, researchResults } = req.body;

      if (!message || !businessType) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      // Define the conversation flow steps
      const stepFlow = {
        customer_example: {
          next: "unique_attributes",
          systemPrompt: "You are a strategic sales consultant with real-time market research capabilities. Keep responses very short - 1-2 sentences max. Research the user's industry when mentioned. Ask one specific question.",
          userPrompt: (type: string) => `The user is providing an example of their customer. They said: "${message}". Ask one specific follow-up question about their customer base or market segment.`
        },
        business_description: {
          next: "unique_attributes",
          systemPrompt: "You are a strategic sales consultant with real-time market research capabilities. Keep responses very short - 1-2 sentences max. Research the user's industry when mentioned. Ask one specific question.",
          userPrompt: (type: string) => `The user is selling a ${type}. They said: "${message}". Research this industry briefly and ask one specific question about what makes their ${type} unique or different from competitors.`
        },
        unique_attributes: {
          next: "target_customers", 
          systemPrompt: "Keep responses very short - 1-2 sentences max. Use market research to understand their competitive landscape. Ask one specific question about target customers.",
          userPrompt: () => `Based on their business description, research their market and ask one specific question about who their ideal customers are - what type of businesses or people they sell to.`
        },
        target_customers: {
          next: "market_positioning",
          systemPrompt: "Keep responses very short - 1-2 sentences max. Research market trends for their target customer segment. Ask one specific question about market approach.",
          userPrompt: () => `Research current trends for their target market and ask one question about their market focus - geographic area, company size, or industry niche.`
        },
        market_positioning: {
          next: "strategic_plan",
          systemPrompt: "Keep responses very short - 1-2 sentences max. Research their competitive positioning. Summarize briefly and ask for confirmation.",
          userPrompt: () => `Research their market position and briefly summarize their business strategy in 1-2 sentences. Ask if they want to generate research-backed search prompts.`
        },
        strategic_plan: {
          next: "complete",
          systemPrompt: "Keep responses very short - 1-2 sentences max. Provide market-informed strategic insights.",
          userPrompt: () => `Based on market research, I'll create your strategic profile and generate targeted search prompts that leverage current market opportunities.`
        }
      };

      const currentStepConfig = stepFlow[currentStep as keyof typeof stepFlow];
      if (!currentStepConfig) {
        res.status(400).json({ message: "Invalid step" });
        return;
      }

      // Prepare messages for OpenAI with conversation history
      const openaiMessages = [
        {
          role: "system" as const,
          content: currentStepConfig.systemPrompt
        }
      ];

      // Add conversation history from the current session
      if (conversationHistory && conversationHistory.length > 0) {
        // Skip the initial personalized message to avoid role alternation issues
        // Start from the first user message (customer example)
        const previousMessages = conversationHistory.slice(0, -1);
        const userMessages = previousMessages.filter((msg: any) => msg.sender === 'user');
        const aiMessages = previousMessages.filter((msg: any) => msg.sender === 'ai' && !msg.content.includes("Perfect! So you're selling"));
        
        // Only include alternating messages starting with user messages
        let lastRole = 'system';
        for (const msg of previousMessages) {
          // Skip the initial personalized message
          if (msg.sender === 'ai' && msg.content.includes("Perfect! So you're selling")) {
            continue;
          }
          
          if (msg.sender === 'ai' && lastRole !== 'assistant') {
            openaiMessages.push({
              role: "assistant" as const,
              content: msg.content
            });
            lastRole = 'assistant';
          } else if (msg.sender === 'user' && lastRole !== 'user') {
            openaiMessages.push({
              role: "user" as const,
              content: msg.content
            });
            lastRole = 'user';
          }
        }
      }
        
      // Add the new user message
      openaiMessages.push({
        role: "user" as const,
        content: message
      });

      // If we have background research results, add them to the system context
      if (researchResults && researchResults.research) {
        openaiMessages[0].content += `\n\nBACKGROUND RESEARCH COMPLETED:\n${researchResults.research}\n\nUse this research to provide informed, strategic insights in your response.`;
      }

      // Get AI response from Perplexity for real-time market research
      const perplexityMessages: PerplexityMessage[] = openaiMessages.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content
      }));
      
      const aiResponse = await queryPerplexity(perplexityMessages);

      // Process the response and update profile data
      let profileUpdate: any = {};
      let nextStep = currentStep;
      let completed = false;

      // Extract information based on current step
      switch (currentStep) {
        case "business_description":
          profileUpdate.businessDescription = message;
          nextStep = currentStepConfig.next;
          break;
        case "unique_attributes":
          profileUpdate.uniqueAttributes = extractAttributes(message);
          nextStep = currentStepConfig.next;
          break;
        case "target_customers":
          profileUpdate.targetCustomers = message;
          nextStep = currentStepConfig.next;
          break;
        case "market_positioning":
          profileUpdate.marketNiche = extractMarketNiche(message);
          nextStep = currentStepConfig.next;
          break;
        case "strategic_plan":
          completed = true;
          profileUpdate.status = "completed";
          profileUpdate.searchPrompts = generateSearchPrompts(profileData, businessType);
          break;
      }

      // If user is authenticated, save profile to database
      if (req.user) {
        try {
          const userId = getUserId(req);
          
          // Create or update strategic profile
          const existingProfiles = await storage.getStrategicProfiles?.(userId) || [];
          
          if (existingProfiles.length > 0) {
            // Update existing profile
            await storage.updateStrategicProfile?.(existingProfiles[0].id, {
              ...profileData,
              ...profileUpdate,
              businessType,
              updatedAt: new Date()
            });
          } else {
            // Create new profile
            await storage.createStrategicProfile?.({
              userId,
              title: profileUpdate.businessDescription || profileData.businessDescription || "Strategy Plan",
              businessType,
              businessDescription: profileUpdate.businessDescription || profileData.businessDescription || "",
              targetCustomers: profileUpdate.targetCustomers || profileData.targetCustomers || "",
              ...profileUpdate
            });
          }
        } catch (error) {
          console.error("Error saving strategic profile:", error);
          // Continue without failing - user can still use the interface
        }
      }

      res.json({
        aiResponse,
        profileUpdate,
        nextStep,
        completed
      });

    } catch (error) {
      console.error("Onboarding chat error:", error);
      res.status(500).json({
        message: "Failed to process chat message. Please check your AI service configuration."
      });
    }
  });

  // Background Research Endpoint
  app.post("/api/onboarding/research", async (req, res) => {
    try {
      const { businessType, formData } = req.body;

      if (!businessType || !formData) {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      console.log(`Starting background research for ${businessType}:`, formData);

      // Construct enhanced research prompt based on comprehensive product profile
      const researchPrompt = `Conduct comprehensive market research for this ${businessType} business:

**Business Profile:**
Product/Service: ${formData.productService}
Location: ${formData.businessLocation || 'Not specified'}
Target Customers: ${formData.primaryCustomerType || 'Not specified'}
Customer Feedback: ${formData.customerFeedback}
Current Sales Channel: ${formData.primarySalesChannel || 'Not specified'}
Primary Business Goal: ${formData.primaryBusinessGoal || 'Not specified'}
Website/Link: ${formData.website || 'Not provided'}

Please research and provide:
1. **Industry Overview & Market Trends** - Current state and growth opportunities in their industry
2. **Local Market Analysis** - Specific insights for their geographic location and market dynamics
3. **Competitive Landscape** - Key competitors, their positioning, and market gaps
4. **Target Customer Analysis** - Deep dive into their customer segment, needs, and purchasing behavior
5. **Sales Channel Optimization** - Analysis of their current approach and better alternatives
6. **Strategic Opportunities** - Specific recommendations aligned with their business goal
7. **90-Day Action Plan** - Tactical steps they can take immediately

Focus on actionable insights that directly support their stated business goal and customer segment.`;

      const researchMessages: PerplexityMessage[] = [
        {
          role: "system",
          content: "You are a market research analyst with access to current market data. Provide comprehensive, up-to-date market intelligence and strategic insights."
        },
        {
          role: "user", 
          content: researchPrompt
        }
      ];

      // Get research from Perplexity
      const researchResults = await queryPerplexity(researchMessages);

      console.log('Background research completed successfully');

      res.json({
        businessType,
        formData,
        research: researchResults,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error("Background research error:", error);
      res.status(500).json({
        message: "Failed to complete background research",
        error: error.message
      });
    }
  });
}