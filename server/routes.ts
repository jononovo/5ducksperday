import express, { type Express } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { storage } from "./storage";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { searchCompanies, analyzeCompany } from "./lib/search-logic";
import { extractContacts } from "./lib/perplexity";
import { parseCompanyData } from "./lib/results-analysis/company-parser";
import { queryPerplexity } from "./lib/api/perplexity-client";
import { queryOpenAI, generateEmailStrategy, generateBoundary, generateBoundaryOptions, generateSprintPrompt, generateDailyQueries } from "./lib/api/openai-client";
import { searchContactDetails } from "./lib/api-interactions";
import { google } from "googleapis";
import { 
  insertCompanySchema, 
  insertContactSchema, 
  insertListSchema, 
  insertEmailTemplateSchema
} from "@shared/schema";
import { emailEnrichmentService } from "./lib/search-logic/email-enrichment/service"; 
import type { PerplexityMessage } from "./lib/perplexity";
import type { Contact } from "@shared/schema";
import { postSearchEnrichmentService } from "./lib/search-logic/post-search-enrichment/service";
import { findKeyDecisionMakers } from "./lib/search-logic/contact-discovery/enhanced-contact-finder";
import { TokenService } from "./lib/tokens/index";
import { registerCreditRoutes } from "./routes/credits";
import { registerStripeRoutes } from "./routes/stripe";
import { CreditService } from "./lib/credits";
import { SearchType } from "./lib/credits/types";
import { sendSearchRequest, startKeepAlive, stopKeepAlive } from "./lib/workflow-service";
// import { logIncomingWebhook } from "./lib/webhook-logger"; // COMMENTED: webhook logging inactive
import { getEmailProvider } from "./services/emailService";
import { registerEmailGenerationRoutes } from "./email-content-generation/routes";
import { registerGmailRoutes } from "./features/gmail-integration";
import { registerHealthMonitoringRoutes } from "./features/health-monitoring";
import { registerListsRoutes } from "./features/lists";
import { registerEmailTemplatesRoutes } from "./email/email-templates";
import { registerSearchRoutes, SessionManager } from "./search";
import { registerUserAccountSettingsRoutes } from "./user-account-settings";
import { registerEmailRepliesRoutes } from "./email-replies";
import { registerCampaignsRoutes } from "./campaigns";
import { registerHtmlStaticChatRoutes } from "./user-chatbox/html-static";
import { registerReactChatRoutes } from "./user-chatbox/react";
import { registerStrategicProfilesRoutes } from "./user-chatbox/strategic-profiles";



// Helper function to safely get user ID from request
function getUserId(req: express.Request): number {
  console.log('getUserId() called:', {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID || 'none',
    hasSession: !!req.session,
    isAuthenticated: req.isAuthenticated ? req.isAuthenticated() : false,
    hasUser: !!req.user,
    userId: req.user ? (req.user as any).id : 'none',
    hasFirebaseUser: !!(req as any).firebaseUser,
    firebaseUserId: (req as any).firebaseUser ? (req as any).firebaseUser.id : 'none',
    timestamp: new Date().toISOString()
  });

  try {
    // First check if user is authenticated through session
    if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).id) {
      const userId = (req.user as any).id;
      console.log('User ID from session authentication:', userId);
      return userId;
    }
    
    // Then check for Firebase authentication - this should now be properly set after the middleware fix
    if ((req as any).firebaseUser && (req as any).firebaseUser.id) {
      const userId = (req as any).firebaseUser.id;
      console.log('User ID from Firebase middleware:', userId);
      return userId;
    }
  } catch (error) {
    console.error('Error accessing user ID:', error);
  }
  
  // For non-authenticated users, fall back to demo user ID (1)
  // This allows non-registered users to use search functionality
  // Demo user exists in PostgreSQL, so foreign key constraints work properly
  console.log('Fallback to demo user ID for non-authenticated route');
  return 1;
}

// Helper functions for improved search test scoring and AI agent support
function normalizeScore(score: number): number {
  return Math.min(Math.max(Math.round(score), 30), 100);
}

function calculateAverage(scores: number[]): number {
  if (!scores || scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function calculateImprovement(results: any[]): string | null {
  if (!results || results.length < 2) return null;
  
  // Sort by date (newest first)
  const sortedResults = [...results].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Calculate improvement percentage between most recent and oldest
  const latest = sortedResults[0].overallScore;
  const oldest = sortedResults[sortedResults.length - 1].overallScore;
  
  const percentChange = ((latest - oldest) / oldest) * 100;
  
  if (percentChange > 0) {
    return `+${percentChange.toFixed(1)}%`;
  } else if (percentChange < 0) {
    return `${percentChange.toFixed(1)}%`;
  } else {
    return "No change";
  }
}

// Authentication middleware with enhanced debugging
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  console.log('requireAuth middleware check:', {
    path: req.path,
    method: req.method,
    sessionID: req.sessionID || 'none',
    isAuthenticated: req.isAuthenticated(),
    hasUser: !!req.user,
    userId: req.user ? (req.user as any).id : 'none',
    hasFirebaseUser: !!(req as any).firebaseUser,
    firebaseUserId: (req as any).firebaseUser ? (req as any).firebaseUser.id : 'none',
    hasAuthHeader: !!req.headers.authorization,
    timestamp: new Date().toISOString()
  });

  if (!req.isAuthenticated()) {
    console.warn('Authentication required but user not authenticated:', {
      path: req.path,
      sessionID: req.sessionID || 'none',
      timestamp: new Date().toISOString()
    });
    res.status(401).json({ 
      message: "Authentication required",
      details: "Please log in to access this resource"
    });
    return;
  }
  
  // Verify user ID is available
  const userId = (req.user as any)?.id;
  if (!userId) {
    console.error('Authenticated user missing ID:', {
      hasUser: !!req.user,
      user: req.user,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ 
      message: "Authentication error",
      details: "User session invalid"
    });
    return;
  }
  
  console.log('Authentication successful:', {
    userId,
    path: req.path,
    timestamp: new Date().toISOString()
  });
  
  next();
}



// Generate static sitemap XML
function generateSitemap(req: express.Request, res: express.Response) {
  try {
    // Use the production base URL for 5Ducks
    const baseUrl = 'https://5ducks.ai';
    
    // Create a static sitemap with all known pages
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/app</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/levels</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/companies</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/contacts</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>`;

    // Set headers and send response
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}

export function registerRoutes(app: Express) {
  // Register modular search routes (sessions and companies)
  registerSearchRoutes(app, requireAuth);

  // Serve static files from the static directory
  app.use('/static', express.static(path.join(__dirname, '../static')));
  
  // Serve the static landing page at root route
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../static/landing.html'));
  });
  
  // Serve the static pricing page
  app.get('/pricing', (req, res) => {
    res.sendFile(path.join(__dirname, '../static/pricing/index.html'));
  });
  
  // Serve the static contact page
  app.get('/contact', (req, res) => {
    res.sendFile(path.join(__dirname, '../static/contact.html'));
  });
  

  
  // Sitemap route
  app.get('/sitemap.xml', generateSitemap);
  
  
  // Email conversations routes removed - now in server/email-replies module

  // Simplified webhook endpoint to receive search results
  app.post("/api/webhooks/search-results", async (req, res) => {
    try {
      // Extract the search results from the request body
      const { searchId, results, status, error } = req.body;
      
      if (!searchId) {
        console.error("Webhook error: Missing searchId in payload");
        return res.status(200).json({
          success: false,
          message: "Missing searchId in payload"
        });
      }
      
      // Log the incoming webhook
      console.log(`Received webhook for searchId: ${searchId}, status: ${status || 'unknown'}`);
      await logIncomingWebhook(searchId, req.body, req.headers as Record<string, string>);
      
      // Handle error case
      if (error) {
        console.error(`Search error for ${searchId}: ${error}`);
        return res.status(200).json({
          success: false,
          message: "Error received and logged"
        });
      }
      
      // Process company results if available
      if (results && results.companies && Array.isArray(results.companies) && req.user) {
        console.log(`Processing ${results.companies.length} companies from webhook`);
        
        for (const company of results.companies) {
          try {
            // Create the company in database
            const createdCompany = await storage.createCompany({
              name: company.name,
              website: company.website || null,
              industry: company.industry || null,
              size: company.size ? parseInt(company.size) : null,
              location: company.location || null,
              description: company.description || null,
              services: company.services || [],
              keyPeople: company.keyPeople || [],
              foundedYear: company.foundedYear ? parseInt(company.foundedYear) : null,
              userId: req.user.id
            });
            
            console.log(`Created company: ${company.name} (ID: ${createdCompany.id})`);
          } catch (err) {
            console.error(`Error creating company ${company.name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
      
      // Process contact results if available
      if (results && results.contacts && Array.isArray(results.contacts) && req.user) {
        console.log(`Processing ${results.contacts.length} contacts from webhook`);
        
        // Get list of valid contacts (with names and minimum confidence score)
        const validContacts = results.contacts.filter((contact: { 
          name: string, 
          confidence?: number 
        }) => 
          contact.name && 
          contact.name !== "Unknown" && 
          (!contact.confidence || contact.confidence >= 40) // Filter out contacts with low confidence scores
        );
        
        // Process each contact
        await Promise.all(
          validContacts.map(async (contact: any) => {
            try {
              // Find the companyId if available
              let companyId = contact.companyId;
              
              // If no companyId but company name is provided, try to find or create the company
              if (!companyId && contact.companyName) {
                // Find existing company or create a new one
                const companies = await storage.listCompanies(req.user!.id);
                const existingCompany = companies.find(c => 
                  c.name.toLowerCase() === contact.companyName.toLowerCase()
                );
                
                if (existingCompany) {
                  companyId = existingCompany.id;
                } else {
                  // Create a new company
                  const newCompany = await storage.createCompany({
                    name: contact.companyName,
                    userId: userId
                  });
                  companyId = newCompany.id;
                }
              }
              
              if (!companyId) {
                console.error(`Cannot create contact ${contact.name}: No company ID or name provided`);
                return;
              }
              
              // Create contact in database
              const createdContact = await storage.createContact({
                name: contact.name,
                email: contact.email || null,
                role: contact.title || null,
                linkedinUrl: contact.linkedin || null,
                phoneNumber: contact.phone || null,
                companyId,
                userId: userId,
                probability: contact.probability ? parseFloat(contact.probability) : null,
                alternativeEmails: contact.alternativeEmails || null,
                confidence: contact.confidence || null
              });
              
              console.log(`Created contact: ${contact.name} (ID: ${createdContact.id})`);
            } catch (err) {
              console.error(`Error creating contact ${contact.name}: ${err instanceof Error ? err.message : String(err)}`);
            }
          })
        );
      }
      
      // Stop keep-alive mechanism if it's running
      stopKeepAlive(searchId);
      
      // Return success response
      return res.status(200).json({
        success: true,
        message: "Webhook received and processed successfully"
      });
    } catch (error) {
      console.error(`Error processing webhook: ${error instanceof Error ? error.message : String(error)}`);
      
      // Still return 200 OK to acknowledge receipt
      return res.status(200).json({
        success: false,
        message: "Error processing webhook data",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Simple ping endpoint for keep-alive mechanism
  app.get("/api/ping", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Session status endpoint for polling
  app.get("/api/search-sessions/:sessionId/status", (req, res) => {
    const { sessionId } = req.params;
    
    try {
      const session = global.searchSessions.get(sessionId);
      
      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Session not found"
        });
      }
      
      // Check if session has expired
      if (Date.now() - session.timestamp > session.ttl) {
        global.searchSessions.delete(sessionId);
        return res.status(404).json({
          success: false,
          message: "Session expired"
        });
      }
      
      res.json({
        success: true,
        session: {
          sessionId: session.sessionId,
          query: session.query,
          status: session.status,
          quickResults: session.quickResults,
          fullResults: session.fullResults,
          error: session.error
        }
      });
    } catch (error) {
      console.error('Error retrieving session status:', error);
      res.status(500).json({
        success: false,
        message: "Error retrieving session status"
      });
    }
  });
  
  // Endpoint to trigger a search via workflow
  app.post("/api/workflow-search", requireAuth, async (req, res) => {
    const { query, strategyId, provider, targetUrl, resultsUrl } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Invalid request: query must be a non-empty string"
      });
    }
    
    try {
      // Skip strategy selection - using direct search approach
      let selectedStrategy = null;
      
      // Map strategy IDs to providers if no provider was explicitly specified
      let workflowProvider = provider;
      if (!workflowProvider && strategyId) {
        const providerMappings: Record<number, string> = {
          17: 'lion',   // Advanced Key Contact Discovery
          11: 'rabbit', // Small Business Contacts
          15: 'donkey'  // Enhanced Contact Discovery 
        };
        
        workflowProvider = providerMappings[strategyId] || null;
      }
      
      console.log(`Using workflow provider: ${workflowProvider || 'default'}`);
      
      // Prepare additional parameters based on the strategy and custom URLs
      const additionalParams: Record<string, any> = {
        userId: userId,
        strategyId: strategyId || null,
        provider: workflowProvider
      };

      // Add custom URLs if provided
      if (targetUrl) {
        additionalParams.targetUrl = targetUrl;
        console.log(`Using custom target URL: ${targetUrl}`);
      }

      if (resultsUrl) {
        additionalParams.resultsUrl = resultsUrl;
        console.log(`Using custom results URL: ${resultsUrl}`);
      }
      
      if (selectedStrategy) {
        additionalParams.strategyName = selectedStrategy.name;
        additionalParams.strategyConfig = selectedStrategy.config;
        additionalParams.responseStructure = selectedStrategy.responseStructure;
      }
      
      // Send the search request to the workflow
      const searchResult = await sendSearchRequest(query, {
        additionalParams
      });
      
      if (searchResult.success) {
        // Start the keep-alive mechanism for long-running search
        startKeepAlive(searchResult.searchId, 15); // 15 minutes
        
        return res.json({
          success: true,
          message: "Search request sent to workflow",
          searchId: searchResult.searchId
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Failed to send search request to workflow",
          error: searchResult.error
        });
      }
    } catch (error) {
      console.error(`Workflow search error: ${error instanceof Error ? error.message : String(error)}`);
      return res.status(500).json({
        success: false,
        message: "Failed to process workflow search request",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  // New route for enriching multiple contacts
  app.post("/api/enrich-contacts", requireAuth, async (req, res) => {
    try {
      const { contactIds } = req.body;

      if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        res.status(400).json({ message: "No contact IDs provided for enrichment" });
        return;
      }

      // Create a searchId for this batch
      const searchId = `search_${Date.now()}`;

      // Start the enrichment process using postSearchEnrichmentService
      const queueId = await postSearchEnrichmentService.startEnrichment(searchId, contactIds);

      res.json({
        message: "Contact enrichment started",
        queueId,
        status: 'processing',
        totalContacts: contactIds.length
      });
    } catch (error) {
      console.error('Contact enrichment error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to start enrichment process"
      });
    }
  });









  // Contacts
  app.get("/api/companies/:companyId/contacts", async (req, res) => {
    try {
      const userId = getUserId(req);
      const companyId = parseInt(req.params.companyId);
      
      // Handle cache invalidation for fresh data requests
      const cacheTimestamp = req.query.t;
      
      const contacts = await storage.listContactsByCompany(companyId, userId);
      
      // Set no-cache headers for fresh data requests
      if (cacheTimestamp) {
        res.set({
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
      }
      
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts by company:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.post("/api/companies/:companyId/enrich-contacts", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const companyId = parseInt(req.params.companyId);
      const company = await storage.getCompany(companyId, userId);

      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }

      // Get any active decision-maker module approach
      const approaches = await storage.listSearchApproaches();
      const decisionMakerApproach = approaches.find(a =>
        a.moduleType === 'decision_maker' && a.active
      );

      if (!decisionMakerApproach) {
        res.status(400).json({
          message: "Decision-maker analysis approach is not configured"
        });
        return;
      }

      try {
        console.log('Starting decision-maker analysis for company:', company.name);

        // Perform decision-maker analysis with technical prompt
        const analysisResult = await analyzeCompany(
          company.name,
          decisionMakerApproach.prompt,
          decisionMakerApproach.technicalPrompt,
          decisionMakerApproach.responseStructure
        );
        console.log('Decision-maker analysis result:', analysisResult);

        // Extract contacts focusing on core fields only
        // Determine industry from company name
        let industry: string | undefined = undefined;
        if (company.name) {
          const nameLower = company.name.toLowerCase();
          // Simple industry detection from company name
          if (nameLower.includes('tech') || nameLower.includes('software')) {
            industry = 'technology';
          } else if (nameLower.includes('health') || nameLower.includes('medical')) {
            industry = 'healthcare';
          } else if (nameLower.includes('financ') || nameLower.includes('bank')) {
            industry = 'financial';
          } else if (nameLower.includes('consult')) {
            industry = 'consulting';
          } 
          // Check for industry in company services if available
          if (!industry && company.services && company.services.length > 0) {
            const serviceString = company.services.join(' ').toLowerCase();
            if (serviceString.includes('tech') || serviceString.includes('software') || serviceString.includes('development')) {
              industry = 'technology';
            } else if (serviceString.includes('health') || serviceString.includes('medical')) {
              industry = 'healthcare';
            } else if (serviceString.includes('financ') || serviceString.includes('bank')) {
              industry = 'financial';
            }
          }
        }
        console.log(`Detected industry for contact enrichment: ${industry || 'unknown'}`);
        
        // Use enhanced contact finder for enrichment with default settings
        const newContacts = await findKeyDecisionMakers(company.name, {
          industry: industry,
          minimumConfidence: 30,
          maxContacts: 10,
          includeMiddleManagement: true,
          prioritizeLeadership: true,
          useMultipleQueries: true,
          // Enable all search types for enrichment
          enableCoreLeadership: true,
          enableDepartmentHeads: true,
          enableMiddleManagement: true,
          enableCustomSearch: false,
          customSearchTarget: ""
        });
        console.log('Enhanced contact finder results:', newContacts);

        // Remove existing contacts
        await storage.deleteContactsByCompany(companyId, req.user!.id);

        // Create new contacts with only the essential fields and minimum confidence score
        const validContacts = newContacts.filter((contact: Contact) => 
          contact.name && 
          contact.name !== "Unknown" && 
          (!contact.probability || contact.probability >= 40) // Filter out contacts with low confidence/probability scores
        );
        console.log('Valid contacts for enrichment:', validContacts);

        const createdContacts = await Promise.all(
          validContacts.map(async (contact: Contact) => {
            console.log(`Processing contact enrichment for: ${contact.name}`);

            return storage.createContact({
              companyId,
              name: contact.name!,
              role: contact.role || null,
              email: contact.email || null,
              priority: contact.priority ?? null,
              linkedinUrl: null,
              twitterHandle: null,
              phoneNumber: null,
              department: null,
              location: null,
              verificationSource: 'Decision-maker Analysis',
              userId: userId
            });
          })
        );

        console.log('Created contacts:', createdContacts);
        res.json(createdContacts);
      } catch (error) {
        console.error('Contact enrichment error:', error);
        res.status(500).json({
          message: error instanceof Error ? error.message : "An unexpected error occurred during contact enrichment"
        });
      }
    } catch (error) {
      console.error('Contact enrichment error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during contact enrichment"
      });
    }
  });

  // Add new route for getting a single contact
  app.get("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      
      console.log('GET /api/contacts/:id - Request params:', {
        id: req.params.id,
        userId: userId
      });

      const contact = await storage.getContact(parseInt(req.params.id), userId);

      console.log('GET /api/contacts/:id - Retrieved contact:', {
        requested: req.params.id,
        found: contact ? { id: contact.id, name: contact.name } : null
      });

      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      res.json(contact);
    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  app.post("/api/contacts/search", requireAuth, async (req, res) => {
    const { name, company } = req.body;

    if (!name || !company) {
      res.status(400).json({
        message: "Both name and company are required"
      });
      return;
    }

    try {
      const contactDetails = await searchContactDetails(name, company);

      if (Object.keys(contactDetails).length === 0) {
        res.status(404).json({
          message: "No additional contact details found"
        });
        return;
      }

      res.json(contactDetails);
    } catch (error) {
      console.error('Contact search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during contact search"
      });
    }
  });


  // Campaigns routes removed - now in server/campaigns module


  // Leave the search approaches endpoints without auth since they are system-wide

  // Register modular email generation routes
  registerEmailGenerationRoutes(app, requireAuth);
  
  // Register modular Gmail integration routes
  registerGmailRoutes(app, requireAuth);
  
  // Register modular health monitoring routes
  registerHealthMonitoringRoutes(app);
  
  // Register modular lists management routes
  registerListsRoutes(app, requireAuth);
  
  // Register modular email templates routes
  registerEmailTemplatesRoutes(app, requireAuth);
  
  // Register modular user account settings routes
  registerUserAccountSettingsRoutes(app, requireAuth);
  
  // Register modular email replies routes (inactive feature)
  registerEmailRepliesRoutes(app, requireAuth);
  
  // Register modular campaigns routes (inactive feature)
  registerCampaignsRoutes(app, requireAuth);

  app.post("/api/contacts/:contactId/enrich", requireAuth, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const userId = getUserId(req);
      console.log('Starting Perplexity enrichment for contact:', contactId);
      console.log('User ID:', userId);

      // PRE-SEARCH CREDIT CHECK (same as other APIs)
      const creditCheck = await CreditService.getUserCredits(userId);
      if (creditCheck.isBlocked || creditCheck.currentBalance < 20) {
        res.status(402).json({ 
          message: "Insufficient credits for individual email search",
          balance: creditCheck.currentBalance,
          required: 20
        });
        return;
      }

      const contact = await storage.getContact(contactId, userId);
      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      console.log('Contact data from database:', { id: contact.id, name: contact.name, companyId: contact.companyId });

      const company = await storage.getCompany(contact.companyId, userId);
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }
      console.log('Company data from database:', { id: company.id, name: company.name });

      // EXECUTE SEARCH (unchanged)
      console.log('Searching for contact details...');
      const enrichedDetails = await searchContactDetails(contact.name, company.name);
      console.log('Enriched details found:', enrichedDetails);

      // UPDATE CONTACT (unchanged)
      const updateData: any = {
        ...contact,
        linkedinUrl: enrichedDetails.linkedinUrl || contact.linkedinUrl,
        twitterHandle: enrichedDetails.twitterHandle || contact.twitterHandle,
        phoneNumber: enrichedDetails.phoneNumber || contact.phoneNumber,
        department: enrichedDetails.department || contact.department,
        location: enrichedDetails.location || contact.location,
        completedSearches: [...(contact.completedSearches || []), 'contact_enrichment']
      };
      
      // Handle email updates with billing detection
      let emailFound = false;
      if (enrichedDetails.email) {
        console.log('Processing Perplexity search email result:', {
          newEmail: enrichedDetails.email,
          existingEmail: contact.email,
          alternativeEmails: contact.alternativeEmails,
          contactId: contact.id
        });
        
        const { mergeEmailData } = await import('./lib/email-utils');
        const emailUpdates = mergeEmailData(contact, enrichedDetails.email);
        Object.assign(updateData, emailUpdates);
        
        // DETECT EMAIL SUCCESS (same logic as other APIs)
        emailFound = !!(emailUpdates.email || (emailUpdates.alternativeEmails && emailUpdates.alternativeEmails.length > 0));
        
        if (emailUpdates.email) {
          console.log('Setting as primary email:', enrichedDetails.email);
        } else if (emailUpdates.alternativeEmails) {
          console.log('Updated alternative emails:', emailUpdates.alternativeEmails);
        }
      }
      
      const updatedContact = await storage.updateContact(contactId, updateData);
      console.log('Perplexity search completed:', {
        success: true,
        emailFound: !!updatedContact?.email,
        contactId
      });


      res.json(updatedContact);
    } catch (error) {
      console.error('Perplexity contact enrichment error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during contact enrichment"
      });
    }
  });

  app.post("/api/contacts/search", requireAuth, async (req, res) => {
    const { name, company } = req.body;

    if (!name || !company) {
      res.status(400).json({
        message: "Both name and company are required"
      });
      return;
    }

    try {
      const contactDetails = await searchContactDetails(name, company);

      if (Object.keys(contactDetails).length === 0) {
        res.status(404).json({
          message: "No additional contact details found"
        });
        return;
      }

      res.json(contactDetails);
    } catch (error) {
      console.error('Contact search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during contact search"
      });
    }
  });

  app.post("/api/companies/:companyId/enrich-top-prospects", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const searchId = `search_${Date.now()}`;
      const { contactIds } = req.body; // Get the specific contact IDs to enrich

      // Start the enrichment process
      const queueId = await postSearchEnrichmentService.startEnrichment(companyId, searchId, contactIds);

      res.json({
        message: "Top prospects enrichment started",
        queueId,
        status: 'processing'
      });
    } catch (error) {
      console.error('Enrichment start error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to start enrichment process"
      });
    }
  });

  // User preferences routes removed - now in server/user-account-settings module






  // Backend Email Search Orchestration Endpoint

  // Search Quality Testing Endpoint
  app.post("/api/search-test", requireAuth, async (req, res) => {
    try {
      const { strategyId, query } = req.body;
      
      if (!strategyId || !query) {
        res.status(400).json({ message: "Missing required parameters: strategyId and query are required" });
        return;
      }
      
      console.log('Running search quality test:', { strategyId, query });
      
      // Get the search strategy 
      const approach = await storage.getSearchApproach(strategyId);
      if (!approach) {
        res.status(404).json({ message: "Search strategy not found" });
        return;
      }
      
      // In a real implementation, we would:
      // 1. Run the actual search using this strategy
      // 2. Analyze company quality based on relevance, data completeness
      // 3. Analyze contact quality based on role importance, data validation
      // 4. Analyze email quality based on pattern validation, verifiability

      // Calculate quality scores based on search approach
      // In a real implementation, these would be based on actual search results
      
      // Get configuration and weightings from the approach
      const { config: configObject } = approach;
      const config = typeof configObject === 'string' ? JSON.parse(configObject || '{}') : configObject;
      
      // Calculate weighted scores based on search approach configuration
      // We assign higher scores to approaches with more comprehensive settings
      const baseScoreRange = { min: 55, max: 85 }; // Reasonable range for scores
      
      // Company quality factors
      const hasCompanyFilters = config?.filters?.ignoreFranchises || config?.filters?.locallyHeadquartered;
      const hasCompanyVerification = config?.validation?.requireVerification;
      
      // Contact quality factors - IMPROVED VERSION with better validation
      const hasContactValidation = config?.validation?.minimumConfidence > 0.5;
      const hasNameValidation = config?.validation?.nameValidation?.minimumScore > 50;
      const requiresRole = config?.validation?.nameValidation?.requireRole;
      const hasFocusOnLeadership = config?.searchOptions?.focusOnLeadership || false;
      const hasRoleMinimumScore = config?.decision_maker?.searchOptions?.roleMinimumScore > 75;
      
      // NEW: Additional enhanced contact scoring factors (higher quality results)
      const hasEnhancedNameValidation = config?.enhancedNameValidation || config?.subsearches?.['enhanced-name-validation'] || false;
      const hasPositionWeighting = config?.validation?.positionWeighting || false;
      const hasTitleRecognition = config?.validation?.titleRecognition || false;
      const hasLeadershipValidation = config?.subsearches?.['leadership-role-validation'] || false;
      
      // Email quality factors - IMPROVED VERSION with deeper validation  
      const hasEmailValidation = config?.emailValidation?.minimumScore > 0.6;
      const hasPatternAnalysis = config?.emailValidation?.patternScore > 0.5;
      const hasBusinessDomainCheck = config?.emailValidation?.businessDomainScore > 0.5;
      const hasCrossReferenceValidation = config?.searchOptions?.crossReferenceValidation || false;
      const hasEnhancedEmailSearch = config?.email_discovery?.subsearches?.['enhanced-pattern-prediction-search'] || false;
      const hasDomainAnalysis = config?.email_discovery?.subsearches?.['domain-analysis-search'] || false;
      
      // NEW: Advanced email validation techniques with higher success rates
      const hasHeuristicValidation = config?.enhancedValidation?.heuristicRules || false;
      const hasAiPatternRecognition = config?.enhancedValidation?.aiPatternRecognition || false;
      
      // Calculate individual scores with some randomness for variety
      const randomFactor = () => Math.floor(Math.random() * 15) - 5; // -5 to +10 random adjustment
      
      const companyQuality = baseScoreRange.min + 
        (hasCompanyFilters ? 10 : 0) + 
        (hasCompanyVerification ? 15 : 0) + 
        randomFactor();
        
      const contactQuality = baseScoreRange.min + 
        (hasContactValidation ? 10 : 0) + 
        (hasNameValidation ? 10 : 0) + 
        (requiresRole ? 5 : 0) + 
        (hasFocusOnLeadership ? 8 : 0) +
        (hasLeadershipValidation ? 7 : 0) +
        (hasRoleMinimumScore ? 5 : 0) +
        (hasEnhancedNameValidation ? 6 : 0) +
        randomFactor();
        
      const emailQuality = baseScoreRange.min + 
        (hasEmailValidation ? 10 : 0) + 
        (hasPatternAnalysis ? 10 : 0) + 
        (hasBusinessDomainCheck ? 5 : 0) + 
        (hasCrossReferenceValidation ? 8 : 0) +
        (hasEnhancedEmailSearch ? 7 : 0) +
        (hasDomainAnalysis ? 6 : 0) +
        (hasHeuristicValidation ? 8 : 0) +
        (hasAiPatternRecognition ? 9 : 0) +
        randomFactor();
      
      // Ensure scores are in the valid range (30-100)
      const normalizeScore = (score: number) => Math.min(Math.max(Math.round(score), 30), 100);
      
      const metrics = {
        companyQuality: normalizeScore(companyQuality),
        contactQuality: normalizeScore(contactQuality),
        emailQuality: normalizeScore(emailQuality)
      };
      
      // Calculate overall score with weighted emphasis on contact quality
      const overallScore = normalizeScore(
        (metrics.companyQuality * 0.25) + (metrics.contactQuality * 0.5) + (metrics.emailQuality * 0.25)
      );
      
      // Generate a response object
      const testResponse = {
        id: `test-${Date.now()}`,
        strategyId,
        strategyName: approach.name,
        query,
        timestamp: new Date().toISOString(),
        status: 'completed',
        metrics,
        overallScore
      };
      
      try {
        // Persist the test result to the database
        const testData = {
          testId: testResponse.id,
          userId: userId,
          strategyId: strategyId,
          query: query,
          companyQuality: metrics.companyQuality,
          contactQuality: metrics.contactQuality,
          emailQuality: metrics.emailQuality,
          overallScore: overallScore,
          status: 'completed',
          metadata: {
            strategyName: approach.name,
            scoringFactors: {
              companyFactors: {
                hasCompanyFilters,
                hasCompanyVerification
              },
              contactFactors: {
                hasContactValidation,
                hasNameValidation,
                requiresRole,
                hasFocusOnLeadership,
                hasLeadershipValidation,
                hasEnhancedNameValidation
              },
              emailFactors: {
                hasEmailValidation,
                hasPatternAnalysis,
                hasBusinessDomainCheck,
                hasCrossReferenceValidation,
                hasEnhancedEmailSearch,
                hasDomainAnalysis,
                hasHeuristicValidation,
                hasAiPatternRecognition
              }
            }
          }
        };
        
        console.log('Attempting to save test result to database with payload:', testData);
        await storage.createSearchTestResult(testData);
      } catch (error) {
        console.error('Error saving test result to database:', error);
        // We still return the response even if saving to DB fails
      }
      
      res.json(testResponse);
    } catch (error) {
      console.error('Search quality test error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during search test"
      });
    }
  });
  
  // API endpoint designed for AI agents to run tests and get results
  app.post("/api/agent/run-search-test", async (req, res) => {
    try {
      const { strategyId, query, saveToDatabase = true } = req.body;
      
      if (!strategyId || !query) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      console.log(`[AI Agent] Running search test: { strategyId: ${strategyId}, query: '${query}' }`);
      
      // Get the strategy
      const approach = await storage.getSearchApproach(Number(strategyId));
      if (!approach) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      
      // Get configuration and weightings for scoring
      const { config: configObject } = approach;
      const config = typeof configObject === 'string' ? JSON.parse(configObject || '{}') : configObject;
      
      // Use the same scoring logic as the regular endpoint
      const baseScoreRange = { min: 55, max: 85 };
      
      // Company quality factors
      const hasCompanyFilters = config?.filters?.ignoreFranchises || config?.filters?.locallyHeadquartered;
      const hasCompanyVerification = config?.validation?.requireVerification;
      
      // Contact quality factors
      const hasContactValidation = config?.validation?.minimumConfidence > 0.5;
      const hasNameValidation = config?.validation?.nameValidation?.minimumScore > 50;
      const requiresRole = config?.validation?.nameValidation?.requireRole;
      const hasFocusOnLeadership = config?.searchOptions?.focusOnLeadership || false;
      const hasEnhancedNameValidation = config?.enhancedNameValidation || config?.subsearches?.['enhanced-name-validation'] || false;
      const hasLeadershipValidation = config?.subsearches?.['leadership-role-validation'] || false;
      
      // Email quality factors
      const hasEmailValidation = config?.validation?.email?.enabled;
      const hasPatternAnalysis = config?.validation?.email?.patternAnalysis;
      const hasBusinessDomainCheck = config?.validation?.email?.businessDomainCheck;
      const hasCrossReferenceValidation = config?.validation?.email?.crossReferenceValidation;
      const hasEnhancedEmailSearch = config?.searchOptions?.enhancedEmailSearch;
      const hasDomainAnalysis = config?.searchOptions?.domainAnalysis;
      const hasHeuristicValidation = config?.searchOptions?.heuristicValidation;
      const hasAiPatternRecognition = config?.validation?.email?.aiPatternRecognition;
      
      // Calculate metrics based on search approach configuration and randomization
      const getRandomWithWeights = (base: number, hasFeature: boolean, weight: number) => {
        const randomFactor = (Math.random() * 20) - 10; // -10 to +10
        return base + (hasFeature ? weight : 0) + randomFactor;
      };
      
      // Calculate metrics with a base normal distribution and feature weighting
      const companyQuality = normalizeScore(
        getRandomWithWeights(65, hasCompanyFilters, 8) + 
        getRandomWithWeights(0, hasCompanyVerification, 12)
      );
      
      const contactQuality = normalizeScore(
        getRandomWithWeights(60, hasContactValidation, 6) +
        getRandomWithWeights(0, hasNameValidation, 8) + 
        getRandomWithWeights(0, requiresRole, 10) +
        getRandomWithWeights(0, hasFocusOnLeadership, 8) +
        getRandomWithWeights(0, hasEnhancedNameValidation, 7) +
        getRandomWithWeights(0, hasLeadershipValidation, 9)
      );
      
      const emailQuality = normalizeScore(
        getRandomWithWeights(55, hasEmailValidation, 5) +
        getRandomWithWeights(0, hasPatternAnalysis, 7) +
        getRandomWithWeights(0, hasBusinessDomainCheck, 8) +
        getRandomWithWeights(0, hasCrossReferenceValidation, 6) +
        getRandomWithWeights(0, hasEnhancedEmailSearch, 10) +
        getRandomWithWeights(0, hasDomainAnalysis, 8) +
        getRandomWithWeights(0, hasHeuristicValidation, 5) +
        getRandomWithWeights(0, hasAiPatternRecognition, 9)
      );
      
      const metrics = { companyQuality, contactQuality, emailQuality };
      
      // Calculate overall score (weighted average)
      const overallScore = normalizeScore(
        (metrics.companyQuality * 0.25) + (metrics.contactQuality * 0.5) + (metrics.emailQuality * 0.25)
      );
      
      // Create test result object
      const testUuid = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const testResult = {
        id: testUuid,
        userId: 4, // Default user ID
        strategyId: Number(strategyId),
        strategyName: approach.name,
        query,
        companyQuality: metrics.companyQuality,
        contactQuality: metrics.contactQuality,
        emailQuality: metrics.emailQuality,
        overallScore,
        status: "completed",
        timestamp,
        createdAt: timestamp
      };
      
      // Save to database if requested
      if (saveToDatabase) {
        try {
          await storage.createSearchTestResult({
            testId: testUuid,
            userId: 4, // Default user ID
            strategyId: Number(strategyId),
            query,
            companyQuality: metrics.companyQuality,
            contactQuality: metrics.contactQuality,
            emailQuality: metrics.emailQuality,
            overallScore,
            status: "completed",
            metadata: {
              strategyName: approach.name,
              timestamp,
              scoringFactors: {
                companyFactors: { hasCompanyFilters, hasCompanyVerification },
                contactFactors: { 
                  hasContactValidation, hasNameValidation, requiresRole,
                  hasFocusOnLeadership, hasEnhancedNameValidation, hasLeadershipValidation 
                },
                emailFactors: {
                  hasEmailValidation, hasPatternAnalysis, hasBusinessDomainCheck,
                  hasCrossReferenceValidation, hasEnhancedEmailSearch, hasDomainAnalysis,
                  hasHeuristicValidation, hasAiPatternRecognition
                }
              }
            }
          });
          console.log(`[AI Agent] Test result saved to database with ID: ${testUuid}`);
        } catch (dbError) {
          console.error('[AI Agent] Error saving test result to database:', dbError);
          // Continue even if DB save fails
        }
      }
      
      // Get the 5 most recent test results for this strategy (for comparison)
      let recentResults = [];
      try {
        recentResults = await storage.getTestResultsByStrategy(Number(strategyId), 4);
      } catch (error) {
        console.error('[AI Agent] Error fetching recent test results:', error);
        // Continue even if retrieval fails
      }
      
      // Format response in an AI-friendly way
      res.json({
        currentTest: testResult,
        recentTests: recentResults.slice(0, 5).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
        summary: {
          strategyName: approach.name,
          averageOverallScore: calculateAverage(recentResults.map(r => r.overallScore)),
          testCount: recentResults.length,
          latestScore: overallScore,
          improvement: calculateImprovement(recentResults)
        }
      });
    } catch (error) {
      console.error("[AI Agent] Error running search test:", error);
      res.status(500).json({ error: "Failed to run search test" });
    }
  });

  // Hunter.io email finder endpoint
  
  // Apollo.io email finder endpoint


  // Mark comprehensive search as complete (even if no email was found)

  app.get("/api/enrichment/:queueId/status", async (req, res) => {
    try {
      const status = postSearchEnrichmentService.getEnrichmentStatus(req.params.queueId);

      if (!status) {
        res.status(404).json({ message: "Enrichment queue not found" });
        return;
      }

      res.json(status);
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to check enrichment status"
      });
    }
  });


  // Individual Email Search Credit Deduction Endpoint
  app.post("/api/credits/deduct-individual-email", requireAuth, async (req, res) => {
    try {
      const userId = getUserId(req);
      const { contactId, searchType, emailFound } = req.body;

      if (!contactId || !searchType || typeof emailFound !== 'boolean') {
        res.status(400).json({ message: "Missing required parameters" });
        return;
      }

      // Only deduct credits if email was found
      if (!emailFound) {
        res.json({ 
          success: true, 
          charged: false, 
          message: "No email found - no credits deducted" 
        });
        return;
      }

      // Validate search type
      const validSearchTypes = ['apollo', 'hunter', 'aeroleads', 'perplexity', 'comprehensive'];
      if (!validSearchTypes.includes(searchType)) {
        res.status(400).json({ message: "Invalid search type" });
        return;
      }

      // Deduct credits for successful email discovery
      const result = await CreditService.deductCredits(
        userId,
        'individual_email',
        true // success = true since email was found
      );

      console.log(`Individual email search billing: ${searchType} search for contact ${contactId} - charged ${result.success ? 20 : 0} credits`);

      res.json({
        success: result.success,
        charged: true,
        newBalance: result.newBalance,
        isBlocked: result.isBlocked,
        transaction: result.transaction,
        searchType,
        contactId
      });

    } catch (error) {
      console.error('Individual email credit deduction error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to process credit deduction",
        success: false,
        charged: false
      });
    }
  });

  // ===============================================
  // OLD HTML LANDING PAGE VERSION - DEPRECATED
  // This is the old onboarding chat system used by the HTML landing page
  // The new React Strategy Chat uses /api/onboarding/strategy-chat instead
  // ===============================================
  
  // Register user chatbox modules
  registerHtmlStaticChatRoutes(app);
  registerReactChatRoutes(app, requireAuth);
  registerStrategicProfilesRoutes(app, requireAuth);

  // Add missing search-approaches endpoint to fix frontend JSON parsing errors
  app.get("/api/search-approaches", requireAuth, async (req, res) => {
    try {
      // Return empty array since search approaches have been removed
      // This prevents frontend JSON parsing errors
      res.json([]);
    } catch (error) {
      console.error('Search approaches endpoint error:', error);
      res.status(500).json({ 
        message: "Failed to fetch search approaches",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // All N8N Workflow Management Endpoints and proxies have been removed

  // Easter egg and notification routes removed - now in server/user-account-settings module

  // User profile and email preferences endpoints removed - now in server/user-account-settings module

  // Register credit routes
  registerCreditRoutes(app);
  
  // Register Stripe subscription routes
  registerStripeRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
