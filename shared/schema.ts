import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age"),
  size: integer("size"),
  website: text("website"),
  ranking: integer("website_ranking"),
  linkedinProminence: integer("linkedin_prominence"),
  customerCount: integer("customer_count"),
  rating: integer("rating"),
  services: text("services").array(),
  validationPoints: text("validation_points").array(),
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

export const insertCompanySchema = createInsertSchema(companies).omit({ 
  id: true,
  createdAt: true 
});

export const insertContactSchema = createInsertSchema(contacts).omit({ 
  id: true,
  createdAt: true 
});

export const insertSearchApproachSchema = createInsertSchema(searchApproaches).omit({
  id: true
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type SearchApproach = typeof searchApproaches.$inferSelect;
export type InsertSearchApproach = z.infer<typeof insertSearchApproachSchema>;
