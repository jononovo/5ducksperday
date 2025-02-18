import express, { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { searchCompanies, analyzeCompany } from "./lib/search-logic";
import { extractContacts } from "./lib/perplexity";
import { parseCompanyData } from "./lib/results-analysis/company-parser";
import { queryPerplexity } from "./lib/api/perplexity-client";
import { searchContactDetails } from "./lib/api-interactions";
import { insertCompanySchema, insertContactSchema, insertSearchApproachSchema, insertListSchema, insertCampaignSchema } from "@shared/schema";
import { insertEmailTemplateSchema } from "@shared/schema";
import { emailEnrichmentService } from "./lib/search-logic/email-enrichment/service"; 
import type { PerplexityMessage } from "./lib/perplexity";
import type { Contact } from "@shared/schema";
import { postSearchEnrichmentService } from "./lib/search-logic/post-search-enrichment/service";
import { google } from 'googleapis';

// Authentication middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

export function registerRoutes(app: Express) {
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

  // Lists
  app.get("/api/lists", requireAuth, async (req, res) => {
    const lists = await storage.listLists(req.user!.id);
    res.json(lists);
  });

  app.get("/api/lists/:listId", requireAuth, async (req, res) => {
    const list = await storage.getList(parseInt(req.params.listId), req.user!.id);
    if (!list) {
      res.status(404).json({ message: "List not found" });
      return;
    }
    res.json(list);
  });

  app.get("/api/lists/:listId/companies", requireAuth, async (req, res) => {
    const companies = await storage.listCompaniesByList(parseInt(req.params.listId), req.user!.id);
    res.json(companies);
  });

  app.post("/api/lists", requireAuth, async (req, res) => {
    const { companies, prompt } = req.body;

    if (!Array.isArray(companies) || !prompt || typeof prompt !== 'string') {
      res.status(400).json({ message: "Invalid request: companies must be an array and prompt must be a string" });
      return;
    }

    try {
      const listId = await storage.getNextListId();
      const list = await storage.createList({
        listId,
        prompt,
        resultCount: companies.length,
        userId: req.user!.id
      });

      await Promise.all(
        companies.map(company =>
          storage.updateCompanyList(company.id, listId)
        )
      );

      res.json(list);
    } catch (error) {
      console.error('List creation error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });

  // Companies
  app.get("/api/companies", requireAuth, async (req, res) => {
    const companies = await storage.listCompanies(req.user!.id);
    res.json(companies);
  });

  app.get("/api/companies/:id", requireAuth, async (req, res) => {
    const company = await storage.getCompany(parseInt(req.params.id), req.user!.id);
    if (!company) {
      res.status(404).json({ message: "Company not found" });
      return;
    }
    res.json(company);
  });

  // Companies search endpoint
  app.post("/api/companies/search", requireAuth, async (req, res) => {
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

      // Analyze each company using technical prompts and response structures
      const companies = await Promise.all(
        companyNames.map(async (companyName) => {
          // Run Company Overview analysis with technical prompt
          const overviewResult = await analyzeCompany(
            companyName,
            companyOverview.prompt,
            companyOverview.technicalPrompt,
            companyOverview.responseStructure
          );
          const analysisResults = [overviewResult];

          // If Decision-maker Analysis is active, run it with technical prompt
          if (decisionMakerAnalysis?.active) {
            const decisionMakerResult = await analyzeCompany(
              companyName,
              decisionMakerAnalysis.prompt,
              decisionMakerAnalysis.technicalPrompt,
              decisionMakerAnalysis.responseStructure
            );
            analysisResults.push(decisionMakerResult);
          }

          // Parse results
          const companyData = parseCompanyData(analysisResults);

          // Create the company record first
          const createdCompany = await storage.createCompany({
            name: companyName,
            ...companyData,
            userId: req.user!.id
          });

          // Extract contacts with validation options
          const contacts = await extractContacts(
            analysisResults,
            companyName,
            {
              useLocalValidation: true,
              localValidationWeight: 0.3,
              minimumScore: 20,
              companyNamePenalty: 20
            }
          );

          // Create contact records with basic information
          const createdContacts = await Promise.all(
            contacts.map(contact =>
              storage.createContact({
                companyId: createdCompany.id,
                name: contact.name!,
                role: contact.role ?? null,
                email: contact.email ?? null,
                probability: contact.probability ?? null,
                linkedinUrl: null,
                twitterHandle: null,
                phoneNumber: null,
                department: null,
                location: null,
                verificationSource: 'Decision-maker Analysis',
                nameConfidenceScore: contact.nameConfidenceScore ?? null,
                userFeedbackScore: null,
                feedbackCount: 0,
                userId: req.user!.id
              })
            )
          );

          return { ...createdCompany, contacts: createdContacts };
        })
      );

      // Return results immediately to complete the search
      res.json({
        companies,
        query,
      });

      // After sending response, start email enrichment if enabled
      const emailEnrichmentModule = approaches.find(a =>
        a.moduleType === 'email_enrichment' && a.active
      );

      if (emailEnrichmentModule?.active) {
        const searchId = `search_${Date.now()}`;
        console.log('Starting post-search email enrichment with searchId:', searchId);

        // Process each company's contacts for enrichment asynchronously
        for (const company of companies) {
          try {
            const enrichmentResults = await emailEnrichmentService.enrichTopProspects(company.id);
            console.log(`Queued enrichment for ${enrichmentResults.length} contacts in ${company.name}`);
          } catch (error) {
            console.error(`Email enrichment error for ${company.name}:`, error);
          }
        }
      }

    } catch (error) {
      console.error('Company search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "An unexpected error occurred during company search"
      });
    }
  });

  // Contacts
  app.get("/api/companies/:companyId/contacts", requireAuth, async (req, res) => {
    const contacts = await storage.listContactsByCompany(parseInt(req.params.companyId), req.user!.id);
    res.json(contacts);
  });

  app.post("/api/companies/:companyId/enrich-contacts", requireAuth, async (req, res) => {
    try {
      const companyId = parseInt(req.params.companyId);
      const company = await storage.getCompany(companyId, req.user!.id);

      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }

      // Get the decision-maker analysis approach
      const approaches = await storage.listSearchApproaches();
      const decisionMakerApproach = approaches.find(a =>
        a.name === "Decision-maker Analysis"
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
        const newContacts = await extractContacts([analysisResult]);
        console.log('Extracted contacts:', newContacts);

        // Remove existing contacts
        await storage.deleteContactsByCompany(companyId, req.user!.id);

        // Create new contacts with only the essential fields
        const validContacts = newContacts.filter((contact: Contact) => contact.name && contact.name !== "Unknown");
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
              userId: req.user!.id
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
    const contact = await storage.getContact(parseInt(req.params.id), req.user!.id);
    if (!contact) {
      res.status(404).json({ message: "Contact not found" });
      return;
    }
    res.json(contact);
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


  // Campaigns
  app.get("/api/campaigns", requireAuth, async (req, res) => {
    const campaigns = await storage.listCampaigns(req.user!.id);
    res.json(campaigns);
  });

  app.get("/api/campaigns/:campaignId", requireAuth, async (req, res) => {
    const campaign = await storage.getCampaign(parseInt(req.params.campaignId), req.user!.id);
    if (!campaign) {
      res.status(404).json({ message: "Campaign not found" });
      return;
    }
    res.json(campaign);
  });

  app.post("/api/campaigns", requireAuth, async (req, res) => {
    try {
      // Get next available campaign ID (starting from 2001)
      const campaignId = await storage.getNextCampaignId();

      const result = insertCampaignSchema.safeParse({
        ...req.body,
        campaignId,
        totalCompanies: 0,
        userId: req.user!.id
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

  app.patch("/api/campaigns/:campaignId", requireAuth, async (req, res) => {
    const result = insertCampaignSchema.partial().safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const updated = await storage.updateCampaign(
      parseInt(req.params.campaignId),
      result.data,
      req.user!.id
    );

    if (!updated) {
      res.status(404).json({ message: "Campaign not found" });
      return;
    }

    res.json(updated);
  });

  // Email Templates
  app.get("/api/email-templates", requireAuth, async (req, res) => {
    const templates = await storage.listEmailTemplates(req.user!.id);
    res.json(templates);
  });

  app.get("/api/email-templates/:id", requireAuth, async (req, res) => {
    const template = await storage.getEmailTemplate(parseInt(req.params.id), req.user!.id);
    if (!template) {
      res.status(404).json({ message: "Template not found" });
      return;
    }
    res.json(template);
  });

  app.post("/api/email-templates", requireAuth, async (req, res) => {
    const result = insertEmailTemplateSchema.safeParse({
      ...req.body,
      userId: req.user!.id
    });
    if (!result.success) {
      res.status(400).json({ message: "Invalid request body" });
      return;
    }

    const template = await storage.createEmailTemplate(result.data);
    res.json(template);
  });

  // Leave the search approaches endpoints without auth since they are system-wide
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

    const updated = await storage.updateSearchApproach(parseInt(req.params.id), result.data);
    if (!updated) {
      res.status(404).json({ message: "Search approach not found" });
      return;
    }

    res.json(updated);
  });

  // Keep other existing routes with requireAuth
  app.post("/api/generate-email", requireAuth, async (req, res) => {
    const { emailPrompt, contact, company } = req.body;

    if (!emailPrompt || !company) {
      res.status(400).json({ message: "Missing required parameters" });
      return;
    }

    try {
      // Construct the prompt for Perplexity
      const messages: PerplexityMessage[] = [
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

  app.post("/api/contacts/:contactId/enrich", requireAuth, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      console.log('Starting enrichment for contact:', contactId);

      const contact = await storage.getContact(contactId, req.user!.id);
      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }
      console.log('Found contact:', contact);

      const company = await storage.getCompany(contact.companyId, req.user!.id);
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }
      console.log('Found company:', company.name);

      // Search for additional contact details
      console.log('Searching for contact details...');
      const enrichedDetails = await searchContactDetails(contact.name, company.name);
      console.log('Enriched details found:', enrichedDetails);

      // Update contact with enriched information
      const updatedContact = await storage.updateContact(contactId, {
        ...contact,
        email: enrichedDetails.email || contact.email,
        linkedinUrl: enrichedDetails.linkedinUrl || contact.linkedinUrl,
        twitterHandle: enrichedDetails.twitterHandle || contact.twitterHandle,
        phoneNumber: enrichedDetails.phoneNumber || contact.phoneNumber,
        department: enrichedDetails.department || contact.department,
        location: enrichedDetails.location || contact.location,
        completedSearches: [...(contact.completedSearches || []), 'contact_enrichment']
      });
      console.log('Updated contact:', updatedContact);

      res.json(updatedContact);
    } catch (error) {
      console.error('Contact enrichment error:', error);
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

  // Add this route within the registerRoutes function, before the return statement
  app.post("/api/contacts/:contactId/aeroleads", requireAuth, async (req, res) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const contact = await storage.getContact(contactId);
      if (!contact) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }

      const company = await storage.getCompany(contact.companyId);
      if (!company) {
        res.status(404).json({ message: "Company not found" });
        return;
      }

      // Use the AeroLeads API to search for the email
      const { searchAeroLeads } = await import('./lib/search-logic/email-discovery/aeroleads-search');
      const result = await searchAeroLeads(
        contact.name,
        company.name,
        '9aa11ffaad48543f84020a6ae70b62e2' // API key
      );

      // Update the contact with the results
      const updatedContact = await storage.updateContactWithAeroLeadsResult(
        contactId,
        result
      );

      res.json(updatedContact);
    } catch (error) {
      console.error('AeroLeads search error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to search AeroLeads"
      });
    }
  });

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

  app.post("/api/send-gmail", requireAuth, async (req, res) => {
    try {
      const { to, subject, content } = req.body;

      if (!to || !subject || !content) {
        res.status(400).json({ message: "Missing required email fields" });
        return;
      }

      // Get Gmail token from session
      const gmailToken = req.session.gmailToken;
      if (!gmailToken) {
        res.status(401).json({ message: "Gmail authorization required" });
        return;
      }

      // Create Gmail API client
      const oauth2Client = new google.auth.OAuth2();
      oauth2Client.setCredentials({ access_token: gmailToken });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create email content
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
      const messageParts = [
        'From: ' + req.user!.email,
        'To: ' + to,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '',
        content,
      ];
      const message = messageParts.join('\n');

      // The body needs to be base64url encoded
      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Gmail send error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to send email"
      });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}