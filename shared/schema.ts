import { pgTable, text, serial, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

export const lists = pgTable("lists", {
  id: serial("id").primaryKey(),
  listId: integer("list_id").notNull(),  // This will start from 1001
  prompt: text("prompt").notNull(),
  resultCount: integer("result_count").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  campaignId: text("campaign_id").notNull(),  // Format: CM-00100
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default('draft'),
  startDate: timestamp("start_date"),
  createdAt: timestamp("created_at").defaultNow()
});

export const campaignLists = pgTable("campaign_lists", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  listId: integer("list_id").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  listId: integer("list_id"),  // Reference to the list this company belongs to
  age: integer("age"),
  size: integer("size"),
  website: text("website"),
  ranking: integer("website_ranking"),
  linkedinProminence: integer("linkedin_prominence"),
  customerCount: integer("customer_count"),
  rating: integer("rating"),
  services: text("services").array(),
  validationPoints: text("validation_points").array(),
  differentiation: text("differentiation").array(),
  totalScore: integer("total_score"),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at").defaultNow()
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  email: text("email"),
  priority: integer("priority"),
  createdAt: timestamp("created_at").defaultNow()
});

export const searchApproaches = pgTable("search_approaches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  prompt: text("prompt").notNull(),
  order: integer("order").notNull(),
  active: boolean("active").default(true)
});

// Create Zod schemas for validation
const listSchema = z.object({
  listId: z.number().min(1001),
  prompt: z.string().min(1, "Search prompt is required"),
  resultCount: z.number().min(0)
});

const campaignSchema = z.object({
  campaignId: z.string().regex(/^CM-\d{5}$/, "Campaign ID must be in format CM-00100"),
  name: z.string().min(1, "Campaign name is required"),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'paused']),
  startDate: z.date().optional()
});

const campaignListSchema = z.object({
  campaignId: z.number(),
  listId: z.number()
});

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  listId: z.number().nullable(),
  age: z.number().nullable(),
  size: z.number().nullable(),
  website: z.string().nullable(),
  ranking: z.number().nullable(),
  linkedinProminence: z.number().nullable(),
  customerCount: z.number().nullable(),
  rating: z.number().nullable(),
  services: z.array(z.string()).nullable(),
  validationPoints: z.array(z.string()).nullable(),
  differentiation: z.array(z.string()).nullable(),
  totalScore: z.number().nullable(),
  snapshot: z.record(z.unknown()).nullable()
});

const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  companyId: z.number(),
  role: z.string().nullable(),
  email: z.string().email().nullable(),
  priority: z.number().min(1).max(3).nullable()
});

const searchApproachSchema = z.object({
  name: z.string().min(1, "Name is required"),
  prompt: z.string().min(1, "Prompt is required"),
  order: z.number().min(1),
  active: z.boolean().nullable()
});

export const insertListSchema = listSchema;
export const insertCampaignSchema = campaignSchema;
export const insertCampaignListSchema = campaignListSchema;
export const insertCompanySchema = companySchema;
export const insertContactSchema = contactSchema;
export const insertSearchApproachSchema = searchApproachSchema;

export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignList = typeof campaignLists.$inferSelect;
export type InsertCampaignList = z.infer<typeof insertCampaignListSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type SearchApproach = typeof searchApproaches.$inferSelect;
export type InsertSearchApproach = z.infer<typeof insertSearchApproachSchema>;