import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { searchCompanies, analyzeCompany, parseCompanyData, extractContacts } from "./lib/perplexity";
import { insertCompanySchema, insertContactSchema, insertSearchApproachSchema } from "@shared/schema";

export function registerRoutes(app: Express) {
  const httpServer = createServer(app);

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

    try {
      // Search for matching companies
      const companyNames = await searchCompanies(query);

      // Get search approaches for analysis
      const approaches = await storage.listSearchApproaches();
      const activeApproaches = approaches.filter(approach => approach.active);

      // Analyze each company
      const companies = await Promise.all(
        companyNames.map(async (companyName) => {
          // Run analysis for each approach
          const analysisResults = await Promise.all(
            activeApproaches.map(approach => 
              analyzeCompany(companyName, approach.prompt)
            )
          );

          // Parse results
          const companyData = parseCompanyData(analysisResults);
          const contacts = extractContacts(analysisResults);

          // Create company record
          const company = await storage.createCompany({
            name: companyName,
            ...companyData,
            age: companyData.age ?? null,
            size: companyData.size ?? null,
            website: companyData.website ?? null,
            ranking: companyData.ranking ?? null,
            linkedinProminence: companyData.linkedinProminence ?? null,
            customerCount: companyData.customerCount ?? null,
            rating: companyData.rating ?? null,
            services: companyData.services ?? null,
            validationPoints: companyData.validationPoints ?? null,
            totalScore: companyData.totalScore ?? null,
            snapshot: companyData.snapshot ?? null
          });

          // Create contact records
          const validContacts = contacts.filter(contact => contact.name && contact.name !== "Unknown");
          await Promise.all(
            validContacts.map(contact =>
              storage.createContact({
                companyId: company.id,
                name: contact.name!,
                role: contact.role ?? null,
                email: contact.email ?? null,
                priority: contact.priority ?? null
              })
            )
          );

          return company;
        })
      );

      res.json(companies);
    } catch (error) {
      res.status(500).json({ 
        message: "Error searching companies",
        error: (error as Error).message 
      });
    }
  });

  // Contacts
  app.get("/api/companies/:companyId/contacts", async (req, res) => {
    const contacts = await storage.listContactsByCompany(parseInt(req.params.companyId));
    res.json(contacts);
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

  return httpServer;
}