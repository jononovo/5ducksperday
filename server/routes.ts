import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { searchCompanies, analyzeCompany, parseCompanyData, extractContacts, queryPerplexity } from "./lib/perplexity";
import { insertCompanySchema, insertContactSchema, insertSearchApproachSchema, insertListSchema, insertCampaignSchema } from "@shared/schema";
import {insertEmailTemplateSchema} from "@shared/schema"; 
import { searchContactDetails } from "./lib/perplexity";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  // Lists
  app.get("/api/lists", async (_req, res) => {
    const lists = await storage.listLists();
    res.json(lists);
  });

  app.get("/api/lists/:listId", async (req, res) => {
    const list = await storage.getList(parseInt(req.params.listId));
    if (!list) {
      res.status(404).json({ message: "List not found" });
      return;
    }
    res.json(list);
  });

  app.get("/api/lists/:listId/companies", async (req, res) => {
    const companies = await storage.listCompaniesByList(parseInt(req.params.listId));
    res.json(companies);
  });

  app.post("/api/lists", async (req, res) => {
    const { companies, prompt } = req.body;

    if (!Array.isArray(companies) || !prompt || typeof prompt !== 'string') {
      res.status(400).json({ message: "Invalid request: companies must be an array and prompt must be a string" });
      return;
    }

    try {
      // Get next available list ID (starting from 1001)
      const listId = await storage.getNextListId();

      // Create the list
      const list = await storage.createList({
        listId,
        prompt,
        resultCount: companies.length
      });

      // Update companies with the list ID
      await Promise.all(
        companies.map(company =>
          storage.updateCompanyList(company.id, listId)
        )
      );

      res.json(list);
    } catch (error) {
      console.error('List creation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred while creating the list"
      });
    }
  });

  // Companies
  app.get("/api/companies", async (_req, res) => {
    const companies = await storage.listCompanies();
    res.json(companies);
  });

  app.get("/api/companies/:id", async (req, res) => {
    const company = await storage.getCompany(parseInt(req.params.id));
    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }
    res.json(company);
  });

  app.post("/api/companies/search", async (req, res) => {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json({
        message: "Invalid request: query must be a non-empty string"
      });
      return;
    }

    try {
      // Search for matching companies
      const companyNames = await searchCompanies(query);

      // Get search approaches for analysis
      const approaches = await storage.listSearchApproaches();

      // Get Company Overview and Decision-maker Analysis approaches
      const companyOverview = approaches.find(a => 
        a.name === "Company Overview" && a.active
      );

      const decisionMakerAnalysis = approaches.find(a => 
        a.name === "Decision-maker Analysis" && a.active
      );

      if (!companyOverview) {
        res.status(400).json({
          message: "Company Overview approach is not active. Please activate it to proceed."
        });
        return;
      }

      // Analyze each company
      const companies = await Promise.all(
        companyNames.map(async (companyName) => {
          // First run Company Overview analysis
          const overviewResult = await analyzeCompany(companyName, companyOverview.prompt);
          const analysisResults = [overviewResult];

          // If Decision-maker Analysis is active, run it immediately after
          if (decisionMakerAnalysis?.active) {
            const decisionMakerResult = await analyzeCompany(companyName, decisionMakerAnalysis.prompt);
            analysisResults.push(decisionMakerResult);
          }

          // Parse results
          const companyData = parseCompanyData(analysisResults);
          const contacts = extractContacts(analysisResults);

          // Create company record with explicit field mapping
          const company = await storage.createCompany({
            name: companyName,
            listId: null,
            age: companyData.age ?? null,
            size: companyData.size ?? null,
            website: companyData.website?.trim() || null,
            alternativeProfileUrl: companyData.alternativeProfileUrl?.trim() || null,
            defaultContactEmail: companyData.defaultContactEmail?.trim() ?? null,
            ranking: companyData.ranking ?? null,
            linkedinProminence: companyData.linkedinProminence ?? null,
            customerCount: companyData.customerCount ?? null,
            rating: companyData.rating ?? null,
            services: companyData.services ?? null,
            validationPoints: companyData.validationPoints ?? null,
            differentiation: companyData.differentiation ?? null,
            totalScore: companyData.totalScore ?? null,
            snapshot: companyData.snapshot || null
          });

          // Create contacts from the decision-maker analysis
          const validContacts = contacts.filter(contact => contact.name && contact.name !== "Unknown");

          // Create contact records with basic information
          const createdContacts = await Promise.all(
            validContacts.map(contact =>
              storage.createContact({
                companyId: company.id,
                name: contact.name!,
                role: contact.role ?? null,
                email: contact.email ?? null,
                priority: contact.priority ?? null,
                linkedinUrl: null,
                twitterHandle: null,
                phoneNumber: null,
                department: null,
                location: null,
                verificationSource: 'Decision-maker Analysis'
              })
            )
          );

          return { ...company, contacts: createdContacts };
        })
      );

      res.json({
        companies,
        query,
      });
    } catch (error) {
      console.error('Company search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during company search"
      });
    }
  });

  // Contacts
  app.get("/api/companies/:companyId/contacts", async (req, res) => {
    const contacts = await storage.listContactsByCompany(parseInt(req.params.companyId));
    res.json(contacts);
  });

  app.post("/api/companies/:companyId/enrich-contacts", async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const company = await storage.getCompany(companyId);

      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }

      // Get the leadership analysis approach
      const approaches = await storage.listSearchApproaches();
      const leadershipApproach = approaches.find(a => 
        a.name.toLowerCase().includes("leadership") && a.active
      );

      if (!leadershipApproach) {
        res.status(400).json({
          message: "Leadership analysis approach is not available or not active"
        });
        return;
      }

      // Extract subsearches configuration
      const config = leadershipApproach.config as Record<string, unknown>;
      const subsearches = (config?.subsearches || {}) as Record<string, boolean>;

      console.log('Leadership analysis config:', config);
      console.log('Enabled subsearches:', subsearches);

      try {
        console.log('Starting leadership analysis for company:', company.name);

        // Perform leadership analysis
        const analysisResult = await analyzeCompany(company.name, leadershipApproach.prompt);
        console.log('Leadership analysis result:', analysisResult);

        const newContacts = extractContacts([analysisResult]);
        console.log('Extracted contacts:', newContacts);

        // Remove existing contacts
        await storage.deleteContactsByCompany(companyId);

        // Create new contacts with enhanced details
        const validContacts = newContacts.filter(contact => contact.name && contact.name !== "Unknown");
        console.log('Valid contacts for enrichment:', validContacts);

        const createdContacts = await Promise.all(
          validContacts.map(async contact => {
            console.log(`Processing contact enrichment for: ${contact.name}`);

            // Get enhanced contact details with local sources search
            const enhancedDetails = await searchContactDetails(
              contact.name!,
              company.name,
              true, // Always include local sources for leadership analysis
              subsearches // Pass enabled subsearches configuration
            );

            console.log('Enhanced contact details:', enhancedDetails);

            const contactData = {
              companyId,
              name: contact.name!,
              role: enhancedDetails.role || contact.role || null,
              email: enhancedDetails.email || contact.email || null,
              priority: contact.priority ?? null,
              linkedinUrl: enhancedDetails.linkedinUrl || null,
              twitterHandle: null,
              phoneNumber: null,
              department: enhancedDetails.department || null,
              location: enhancedDetails.location || null,
              verificationSource: 'Leadership Analysis',
              completedSearches: enhancedDetails.completedSearches || []
            };

            const createdContact = await storage.createContact(contactData);
            return {
              ...createdContact,
              completedSearches: enhancedDetails.completedSearches || []
            };
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

  // Add new contact search endpoint
  app.post("/api/contacts/search", async (req, res) => {
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


  // Search Approaches
  app.get("/api/search-approaches", async (_req, res) => {
    const approaches = await storage.listSearchApproaches();
    res.json(approaches);
  });

  app.patch("/api/search-approaches/:id", async (req, res) => {
    const result = insertSearchApproachSchema.partial().safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const updated = await storage.updateSearchApproach(
      parseInt(req.params.id),
      result.data
    );

    if (!updated) {
      res.status(404).json({ message: "Search approach not found" });
      return;
    }

    res.json(updated);
  });

  // Campaigns
  app.get("/api/campaigns", async (_req, res) => {
    const campaigns = await storage.listCampaigns();
    res.json(campaigns);
  });

  app.get("/api/campaigns/:campaignId", async (req, res) => {
    const campaign = await storage.getCampaign(parseInt(req.params.campaignId));
    if (!campaign) {
      res.status(404).json({ message: "Campaign not found" });
      return;
    }
    res.json(campaign);
  });

  app.post("/api/campaigns", async (req, res) => {
    try {
      // Get next available campaign ID (starting from 2001)
      const campaignId = await storage.getNextCampaignId();

      const result = insertCampaignSchema.safeParse({
        ...req.body,
        campaignId,
        totalCompanies: 0
      });

      if (!result.success) {
        res.status(400).json({ 
          message: "Invalid request body",
          errors: result.error.errors 
        });
        return;
      }

      // Create the campaign
      const campaign = await storage.createCampaign({
        ...result.data,
        description: result.data.description || null,
        startDate: result.data.startDate || null,
        status: result.data.status || 'draft'
      });

      res.json(campaign);
    } catch (error) {
      console.error('Campaign creation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred while creating the campaign"
      });
    }
  });

  app.patch("/api/campaigns/:campaignId", async (req, res) => {
    const result = insertCampaignSchema.partial().safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const updated = await storage.updateCampaign(
      parseInt(req.params.campaignId),
      result.data
    );

    if (!updated) {
      res.status(404).json({ message: "Campaign not found" });
      return;
    }

    res.json(updated);
  });

  // Email Templates
  app.get("/api/email-templates", async (_req, res) => {
    const templates = await storage.listEmailTemplates();
    res.json(templates);
  });

  app.get("/api/email-templates/:id", async (req, res) => {
    const template = await storage.getEmailTemplate(parseInt(req.params.id));
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    res.json(template);
  });

  app.post("/api/email-templates", async (req, res) => {
    const result = insertEmailTemplateSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const template = await storage.createEmailTemplate(result.data);
    res.json(template);
  });

  // Add new route for email generation
  app.post("/api/generate-email", async (req, res) => {
    const { emailPrompt, contact, company } = req.body;

    if (!emailPrompt || !company) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    try {
      // Construct the prompt for Perplexity
      const messages = [
        {
          role: "system",
          content: "You are a professional business email writer. Write personalized, engaging emails that are concise and effective. Focus on building genuine connections while maintaining professionalism."
        },
        {
          role: "user",
          content: `Write a business email based on this context:

Prompt: ${emailPrompt}

Company: ${company.name}
${company.size ? `Size: ${company.size} employees` : ''}
${company.services ? `Services: ${company.services.join(', ')}` : ''}

${contact ? `Recipient: ${contact.name}${contact.role ? ` (${contact.role})` : ''}` : 'No specific recipient selected'}

First, provide a short, engaging subject line prefixed with "Subject: ".
Then, on a new line, write the body of the email. Keep both subject and content concise and professional.`
        }
      ];

      const response = await queryPerplexity(messages);

      // Split response into subject and content
      const parts = response.split('\n').filter(line => line.trim());
      const subjectLine = parts[0].replace(/^Subject:\s*/i, '').trim();
      const content = parts.slice(1).join('\n').trim();

      res.json({ 
        subject: subjectLine,
        content: content 
      });
    } catch (error) {
      console.error('Email generation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during email generation"
      });
    }
  });

  return httpServer;
}