import { pgTable, text, serial, integer, jsonb, timestamp, boolean, uuid, index, real } from "drizzle-orm/pg-core";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  isGuest: boolean("is_guest").default(false)
});

export const lists = pgTable("lists", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),  
  listId: integer("list_id").notNull(),
  prompt: text("prompt").notNull(),
  resultCount: integer("result_count").notNull(),
  customSearchTargets: jsonb("custom_search_targets").default('[]'),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_lists_user_id').on(table.userId),
  index('idx_lists_list_id').on(table.listId),
]);

export const companies = pgTable("companies", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  listId: integer("list_id"),  
  description: text("description"),
  age: integer("age"),
  size: integer("size"),
  website: text("website"),
  alternativeProfileUrl: text("alternative_profile_url"), 
  defaultContactEmail: text("default_contact_email"), 
  ranking: integer("website_ranking"),
  linkedinProminence: integer("linkedin_prominence"),
  customerCount: integer("customer_count"),
  rating: integer("rating"),
  services: jsonb("services").default('[]'),
  validationPoints: jsonb("validation_points").default('[]'),
  differentiation: jsonb("differentiation").default('[]'),
  totalScore: integer("total_score"),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_companies_user_id').on(table.userId),
  index('idx_companies_list_id').on(table.listId),
  index('idx_companies_name').on(table.name),
]);

export const contacts = pgTable("contacts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  email: text("email"),
  alternativeEmails: jsonb("alternative_emails").$type<string[]>().default([]),
  probability: integer("probability"),
  linkedinUrl: text("linkedin_url"),
  twitterHandle: text("twitter_handle"),
  phoneNumber: text("phone_number"),
  department: text("department"),
  location: text("location"),
  verificationSource: text("verification_source"),
  lastEnriched: timestamp("last_enriched", { withTimezone: true }),
  nameConfidenceScore: integer("name_confidence_score"), 
  userFeedbackScore: integer("user_feedback_score"), 
  feedbackCount: integer("feedback_count").default(0), 
  lastValidated: timestamp("last_validated", { withTimezone: true }), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  completedSearches: jsonb("completed_searches").$type<string[]>().default([]),
  // CRM tracking fields
  contactStatus: text("contact_status").default('uncontacted'), // 'uncontacted', 'contacted', 'replied', 'qualified', 'unqualified'
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
  lastContactChannel: text("last_contact_channel"), // 'email', 'sms', 'phone'
  totalCommunications: integer("total_communications").default(0),
  totalReplies: integer("total_replies").default(0),
  lastThreadId: text("last_thread_id") // Most recent conversation thread
}, (table) => [
  index('idx_contacts_company_id').on(table.companyId),
  index('idx_contacts_user_id').on(table.userId),
  index('idx_contacts_email').on(table.email),
]);

/* 
// ====================================================
// INACTIVE FEATURE - CONTACT FEEDBACK (NOT CURRENTLY PUSHED)
// ====================================================
// Uncomment when contact rating functionality is activated

export const contactFeedback = pgTable("contact_feedback", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  contactId: integer("contact_id").notNull(),
  feedbackType: text("feedback_type").notNull(), 
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_contact_feedback_contact_id').on(table.contactId),
]);
*/



export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  description: text("description"),
  category: text("category").default('general'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  // hasSeenTour field removed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Email sending preferences for fallback system
export const userEmailPreferences = pgTable("user_email_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  preferredMethod: text("preferred_method").default('smart-default'), // 'smart-default' | 'gmail' | 'outlook' | 'default-app' | 'ask-always'
  hasSeenFirstTimeModal: boolean("has_seen_first_time_modal").default(false),
  hasSeenIOSNotification: boolean("has_seen_ios_notification").default(false),
  hasSeenAndroidNotification: boolean("has_seen_android_notification").default(false),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  lastUsedMethod: text("last_used_method"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});



// N8N Workflow tables have been removed

const listSchema = z.object({
  listId: z.number().min(1001),
  prompt: z.string().min(1, "Search prompt is required"),
  resultCount: z.number().min(0),
  customSearchTargets: z.array(z.string()).nullable()
});

const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  listId: z.number().nullable(),
  description: z.string().nullable(),
  age: z.number().nullable(),
  size: z.number().nullable(),
  website: z.string().nullable(),
  alternativeProfileUrl: z.string().nullable(),
  defaultContactEmail: z.string().email().nullable(),
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
  probability: z.number().min(1).max(100).nullable(),
  linkedinUrl: z.string().url().nullable(),
  twitterHandle: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  department: z.string().nullable(),
  location: z.string().nullable(),
  verificationSource: z.string().nullable(),
  nameConfidenceScore: z.number().min(0).max(100).nullable(),
  userFeedbackScore: z.number().min(0).max(100).nullable(),
  feedbackCount: z.number().min(0).nullable(),
  alternativeEmails: z.array(z.string()).optional(),
  completedSearches: z.array(z.string()).optional()
});

/* INACTIVE FEATURE SCHEMA - CONTACT FEEDBACK
const contactFeedbackSchema = z.object({
  contactId: z.number(),
  feedbackType: z.enum(['excellent', 'ok', 'terrible'])
});
*/





const emailTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  description: z.string().optional(),
  category: z.string().default('general')
});

const userPreferencesSchema = z.object({
  userId: z.number()
  // hasSeenTour field removed
});

const userEmailPreferencesSchema = z.object({
  preferredMethod: z.enum(['smart-default', 'gmail', 'outlook', 'default-app', 'ask-always']).default('smart-default'),
  hasSeenFirstTimeModal: z.boolean().default(false),
  hasSeenIOSNotification: z.boolean().default(false),
  hasSeenAndroidNotification: z.boolean().default(false),
  successCount: z.number().default(0),
  failureCount: z.number().default(0),
  lastUsedMethod: z.string().optional()
});



// N8N Workflow schemas have been removed

export const insertListSchema = listSchema.extend({
  userId: z.number()
});
export const insertCompanySchema = companySchema;
export const insertContactSchema = contactSchema;
export const insertEmailTemplateSchema = emailTemplateSchema.extend({
  userId: z.number()
});
export const insertUserPreferencesSchema = userPreferencesSchema;
export const insertUserEmailPreferencesSchema = userEmailPreferencesSchema.extend({
  userId: z.number()
});

export type List = typeof lists.$inferSelect;
export type InsertList = z.infer<typeof insertListSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserEmailPreferences = typeof userEmailPreferences.$inferSelect;
export type InsertUserEmailPreferences = z.infer<typeof insertUserEmailPreferencesSchema>;

// N8N workflow types have been removed

// Add user schema and type
export const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isGuest: z.boolean().optional()
});

export const insertUserSchema = userSchema;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Legacy type stubs for components that still import them
export type SearchSection = { id: string; title: string; content: string };

/* 
// ====================================================
// INACTIVE FEATURE - EMAIL CONVERSATIONS & WEBHOOKS (NOT CURRENTLY PUSHED)
// ====================================================
// Uncomment when email conversation tracking and webhook logging is activated

export const emailThreads = pgTable("email_threads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  subject: text("subject").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isArchived: boolean("is_archived").default(false)
});

export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => emailThreads.id),
  from: text("from").notNull(),
  fromEmail: text("from_email").notNull(),
  to: text("to").notNull(),
  toEmail: text("to_email").notNull(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  isRead: boolean("is_read").default(false),
  direction: text("direction").notNull() // "outbound" or "inbound"
});

export const webhookLogs = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull(),
  searchId: text("search_id"),
  source: text("source").notNull(),  // Format: "provider-operation" (e.g. "n8n-send", "n8n-receive")
  method: text("method"),
  url: text("url"),
  headers: jsonb("headers").default({}),
  body: jsonb("body").default({}),
  status: text("status").default("pending"), // pending, success, error
  statusCode: integer("status_code"),
  processingDetails: jsonb("processing_details").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
*/

// Daily Outreach Tables
export const dailyOutreachBatches = pgTable("daily_outreach_batches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  batchDate: timestamp("batch_date", { withTimezone: true }).notNull(),
  secureToken: uuid("secure_token").defaultRandom().notNull(),
  status: text("status").default("pending"), // "pending", "partial", "complete", "expired"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
}, (table) => [
  index('idx_outreach_batch_user_id').on(table.userId),
  index('idx_outreach_batch_token').on(table.secureToken),
  index('idx_outreach_batch_date').on(table.batchDate),
]);

export const dailyOutreachItems = pgTable("daily_outreach_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").notNull().references(() => dailyOutreachBatches.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  communicationId: integer("communication_id").references(() => communicationHistory.id), // Link to CRM record when sent
  emailSubject: text("email_subject").notNull(),
  emailBody: text("email_body").notNull(),
  emailTone: text("email_tone").notNull(),
  status: text("status").default("pending"), // "pending", "sent", "skipped", "edited"
  sentAt: timestamp("sent_at", { withTimezone: true }),
  editedContent: text("edited_content"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_outreach_item_batch_id').on(table.batchId),
  index('idx_outreach_item_contact_id').on(table.contactId),
  index('idx_outreach_item_communication_id').on(table.communicationId),
]);

// CRM Communications History Table
export const communicationHistory = pgTable("communication_history", {
  // Core identification
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  contactId: integer("contact_id").notNull().references(() => contacts.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  
  // Channel & type
  channel: text("channel").notNull().default('email'), // 'email', 'sms', 'phone', 'linkedin', 'whatsapp'
  direction: text("direction").notNull().default('outbound'), // 'outbound', 'inbound'
  
  // Content
  subject: text("subject"), // Email subject, SMS first line, call topic
  content: text("content").notNull(), // Full message content
  contentPreview: text("content_preview"), // First 200 chars for list views
  
  // Status tracking
  status: text("status").notNull().default('pending'),
  // Email: 'pending', 'sent', 'delivered', 'bounced', 'opened', 'clicked', 'replied', 'unsubscribed'
  // SMS: 'pending', 'sent', 'delivered', 'failed', 'replied'
  // Phone: 'scheduled', 'completed', 'no_answer', 'voicemail', 'busy'
  
  // Threading (critical for email replies)
  threadId: text("thread_id"), // Gmail threadId or generated UUID
  parentId: integer("parent_id"),
  inReplyTo: text("in_reply_to"), // Email Message-ID for standard threading
  references: text("references"), // Email References header chain
  
  // Timestamps
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  
  // Attribution
  campaignId: integer("campaign_id"), // Future campaigns
  batchId: integer("batch_id").references(() => dailyOutreachBatches.id),
  templateId: integer("template_id").references(() => emailTemplates.id),
  
  // Enhanced metadata
  metadata: jsonb("metadata").default({}),
  // Structure:
  // {
  //   from: string,
  //   to: string,
  //   cc: string[],
  //   bcc: string[],
  //   replyTo: string,
  //   messageId: string,
  //   gmailThreadId: string,
  //   gmailHistoryId: string,
  //   tone: string,
  //   offerStrategy: string,
  //   sourceTable: 'manual_outreach' | 'daily_outreach',
  //   originalId: number, // ID from source table
  //   headers: object
  // }
  
  // Engagement metrics
  openCount: integer("open_count").default(0),
  clickCount: integer("click_count").default(0),
  clickedLinks: jsonb("clicked_links").$type<string[]>().default([]),
  
  // Error handling
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  
  // Audit
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  // Standard indexes
  index('idx_comm_contact_id').on(table.contactId),
  index('idx_comm_company_id').on(table.companyId),
  index('idx_comm_user_id').on(table.userId),
  index('idx_comm_channel').on(table.channel),
  index('idx_comm_status').on(table.status),
  index('idx_comm_thread_id').on(table.threadId),
  index('idx_comm_sent_at').on(table.sentAt),
  index('idx_comm_created_at').on(table.createdAt),
  // Composite index for contact history queries
  index('idx_comm_contact_sent').on(table.contactId, table.sentAt),
]);

export const userOutreachPreferences = pgTable("user_outreach_preferences", {
  userId: integer("user_id").primaryKey().references(() => users.id),
  enabled: boolean("enabled").default(true),
  scheduleDays: text("schedule_days").array().default(['mon', 'tue', 'wed']),
  scheduleTime: text("schedule_time").default('09:00'), // Store as string for simplicity
  timezone: text("timezone").default('America/New_York'),
  minContactsRequired: integer("min_contacts_required").default(5),
  activeProductId: integer("active_product_id").references(() => strategicProfiles.id),
  lastNudgeSent: timestamp("last_nudge_sent", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_outreach_pref_enabled').on(table.enabled),
]);

// Daily outreach job persistence table
export const dailyOutreachJobs = pgTable("daily_outreach_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  status: text("status").default("scheduled"), // "scheduled", "running", "completed", "failed"
  lastError: text("last_error"),
  retryCount: integer("retry_count").default(0),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_jobs_next_run').on(table.nextRunAt),
  index('idx_jobs_user_status').on(table.userId, table.status),
  index('idx_jobs_retry').on(table.nextRetryAt, table.retryCount),
]);

// Daily outreach job execution logs for audit trail
export const dailyOutreachJobLogs = pgTable("daily_outreach_job_logs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull().references(() => dailyOutreachJobs.id),
  userId: integer("user_id").notNull().references(() => users.id),
  executedAt: timestamp("executed_at", { withTimezone: true }).notNull(),
  status: text("status").notNull(), // "success", "failed", "skipped"
  batchId: integer("batch_id").references(() => dailyOutreachBatches.id),
  processingTimeMs: integer("processing_time_ms"),
  contactsProcessed: integer("contacts_processed"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (table) => [
  index('idx_job_logs_job_id').on(table.jobId),
  index('idx_job_logs_user_id').on(table.userId),
  index('idx_job_logs_executed_at').on(table.executedAt),
]);

// Strategic onboarding tables
// Sender Profiles for Campaigns
export const senderProfiles = pgTable("sender_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  companyName: text("company_name"),
  companyWebsite: text("company_website"),
  title: text("title"), // Job title
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Target Customer Profiles for Campaigns
export const targetCustomerProfiles = pgTable("target_customer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(), // e.g., "Small Business Owners"
  industry: text("industry"),
  companySize: text("company_size"), // e.g., "1-50 employees", "50-200 employees"
  jobTitles: text("job_titles").array(), // e.g., ["CEO", "Owner", "Founder"]
  painPoints: text("pain_points").array(),
  goals: text("goals").array(),
  geography: text("geography"), // e.g., "United States", "Southeast US", "Global"
  budget: text("budget"), // e.g., "< $10k", "$10k-$50k", "> $50k"
  decisionMakingProcess: text("decision_making_process"),
  currentSolutions: text("current_solutions"), // What they currently use
  buyingTriggers: text("buying_triggers").array(), // What makes them buy
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Products table (for campaigns)
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  productService: text("product_service"),
  customerFeedback: text("customer_feedback"),
  website: text("website"),
  businessType: text("business_type"), // "product" or "service"
  status: text("status").default("active"),
  targetCustomers: text("target_customers"),
  primaryCustomerType: text("primary_customer_type"),
  marketNiche: text("market_niche"),
  createdAt: timestamp("created_at").defaultNow()
});

// Product type definitions
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// Campaign Tables
export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  status: text("status").notNull().default("draft"), // draft, active, paused, completed
  senderProfileId: integer("sender_profile_id").references(() => senderProfiles.id),
  productId: integer("product_id").references(() => products.id),
  targetCustomerProfileId: integer("target_customer_profile_id").references(() => targetCustomerProfiles.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  durationDays: integer("duration_days").notNull().default(14), // Default 2 weeks
  dailyLeadTarget: integer("daily_lead_target").notNull().default(5),
  totalLeadsGenerated: integer("total_leads_generated").notNull().default(0),
  responseRate: real("response_rate").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const strategicProfiles = pgTable("strategic_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  businessType: text("business_type").notNull(), // "product" or "service"
  businessDescription: text("business_description").notNull(),
  uniqueAttributes: text("unique_attributes").array(),
  targetCustomers: text("target_customers").notNull(),
  marketNiche: text("market_niche"), // "niche" or "broad"
  // Enhanced product profile fields
  productService: text("product_service"), // What they sell
  customerFeedback: text("customer_feedback"), // What customers say
  website: text("website"), // Company website
  businessLocation: text("business_location"), // Where they're located
  primaryCustomerType: text("primary_customer_type"), // Who they sell to
  primarySalesChannel: text("primary_sales_channel"), // How they find customers
  primaryBusinessGoal: text("primary_business_goal"), // Main business objective
  // Strategy fields for cold email outreach
  strategyHighLevelBoundary: text("strategy_high_level_boundary"), // "3-4 star family-friendly hotels in coastal SE US"
  exampleSprintPlanningPrompt: text("example_sprint_planning_prompt"), // "family-friendly hotels on space coast, florida"
  exampleDailySearchQuery: text("example_daily_search_query"), // "family-friendly hotels in cocoa beach"
  productAnalysisSummary: text("product_analysis_summary"), // AI-generated product profile summary
  reportSalesContextGuidance: text("report_sales_context_guidance"), // AI-generated context for cold email approach
  reportSalesTargetingGuidance: text("report_sales_targeting_guidance"), // AI-generated targeting recommendations
  productOfferStrategies: text("product_offer_strategies"), // JSON array of 6 offer strategies
  dailySearchQueries: text("daily_search_queries"), // JSON array of 8 daily search queries from strategy
  strategicPlan: jsonb("strategic_plan").default({}),
  searchPrompts: text("search_prompts").array(),
  status: text("status").default("in_progress"), // "in_progress", "completed"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const onboardingChats = pgTable("onboarding_chats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => strategicProfiles.id),
  messages: jsonb("messages").default([]),
  currentStep: text("current_step").default("business_description"),
  isComplete: boolean("is_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

/* 
// ====================================================
// INACTIVE FEATURE - PROSPECT DELIVERIES (NOT CURRENTLY PUSHED)
// ====================================================
// Uncomment when scheduled prospect delivery functionality is activated

export const prospectDeliveries = pgTable("prospect_deliveries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  profileId: integer("profile_id").notNull().references(() => strategicProfiles.id),
  searchPrompt: text("search_prompt").notNull(),
  deliveryDate: timestamp("delivery_date").notNull(),
  status: text("status").default("scheduled"), // "scheduled", "delivered", "failed"
  prospectCount: integer("prospect_count").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
*/

// Define Schema for webhook logs
// Email conversation schemas
export const emailThreadSchema = z.object({
  contactId: z.number(),
  subject: z.string().min(1, "Subject is required"),
  isArchived: z.boolean().default(false)
});

export const emailMessageSchema = z.object({
  threadId: z.number(),
  from: z.string().min(1, "Sender name is required"),
  fromEmail: z.string().email("Invalid from email"),
  to: z.string().min(1, "Recipient name is required"),
  toEmail: z.string().email("Invalid to email"),
  content: z.string().min(1, "Message content is required"),
  isRead: z.boolean().default(false),
  direction: z.enum(["outbound", "inbound"])
});

export const webhookLogSchema = z.object({
  requestId: z.string(),
  searchId: z.string().optional(),
  source: z.string(),
  method: z.string().optional(),
  url: z.string().optional(),
  headers: z.record(z.string()).optional(),
  body: z.record(z.unknown()).optional(),
  status: z.enum(["pending", "success", "error"]).default("pending"),
  statusCode: z.number().optional(),
  processingDetails: z.record(z.unknown()).optional()
});

export const insertEmailThreadSchema = emailThreadSchema.extend({
  userId: z.number()
});

export const insertEmailMessageSchema = emailMessageSchema;

export const insertWebhookLogSchema = webhookLogSchema;

// Daily Outreach schemas
export const dailyOutreachBatchSchema = z.object({
  batchDate: z.string(),
  status: z.enum(["pending", "partial", "complete", "expired"]).default("pending"),
  expiresAt: z.string()
});

export const dailyOutreachItemSchema = z.object({
  batchId: z.number(),
  contactId: z.number(),
  companyId: z.number(),
  emailSubject: z.string().min(1, "Email subject is required"),
  emailBody: z.string().min(1, "Email body is required"),
  emailTone: z.string(),
  status: z.enum(["pending", "sent", "skipped", "edited"]).default("pending"),
  sentAt: z.string().optional(),
  editedContent: z.string().optional()
});

export const userOutreachPreferencesSchema = z.object({
  enabled: z.boolean().default(true),
  scheduleDays: z.array(z.string()).default(['mon', 'tue', 'wed']),
  scheduleTime: z.string().default('09:00'),
  timezone: z.string().default('America/New_York'),
  minContactsRequired: z.number().default(5),
  lastNudgeSent: z.string().optional()
});

// Strategic onboarding schemas
// Sender Profile schemas
export const senderProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  title: z.string().optional(),
  isDefault: z.boolean().default(false)
});

// Target Customer Profile schemas
export const targetCustomerProfileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  jobTitles: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  goals: z.array(z.string()).optional(),
  geography: z.string().optional(),
  budget: z.string().optional(),
  decisionMakingProcess: z.string().optional(),
  currentSolutions: z.string().optional(),
  buyingTriggers: z.array(z.string()).optional()
});

export const strategicProfileSchema = z.object({
  title: z.string().min(1, "Title is required"),
  businessType: z.enum(["product", "service"]),
  businessDescription: z.string().min(1, "Business description is required"),
  uniqueAttributes: z.array(z.string()).optional(),
  targetCustomers: z.string().min(1, "Target customers description is required"),
  marketNiche: z.enum(["niche", "broad"]).optional(),
  // Enhanced product profile fields
  productService: z.string().optional(),
  customerFeedback: z.string().optional(),
  website: z.string().optional(),
  businessLocation: z.string().optional(),
  primaryCustomerType: z.string().optional(),
  primarySalesChannel: z.string().optional(),
  primaryBusinessGoal: z.string().optional(),
  // Strategy fields for cold email outreach
  strategyHighLevelBoundary: z.string().optional(),
  exampleSprintPlanningPrompt: z.string().optional(),
  exampleDailySearchQuery: z.string().optional(),
  productAnalysisSummary: z.string().optional(),
  reportSalesContextGuidance: z.string().optional(),
  reportSalesTargetingGuidance: z.string().optional(),
  dailySearchQueries: z.string().optional(),
  strategicPlan: z.record(z.unknown()).optional(),
  searchPrompts: z.array(z.string()).optional(),
  status: z.enum(["in_progress", "completed"]).default("in_progress")
});

export const onboardingChatSchema = z.object({
  profileId: z.number(),
  messages: z.array(z.object({
    id: z.string(),
    content: z.string(),
    role: z.enum(["user", "assistant"]),
    timestamp: z.string()
  })).optional(),
  currentStep: z.string().default("business_description"),
  isComplete: z.boolean().default(false)
});

/* INACTIVE FEATURE SCHEMA - PROSPECT DELIVERIES
export const prospectDeliverySchema = z.object({
  profileId: z.number(),
  searchPrompt: z.string().min(1, "Search prompt is required"),
  deliveryDate: z.string(), // ISO string
  status: z.enum(["scheduled", "delivered", "failed"]).default("scheduled"),
  prospectCount: z.number().default(0)
});

export const insertProspectDeliverySchema = prospectDeliverySchema.extend({
  userId: z.number()
});
*/

export const insertDailyOutreachBatchSchema = dailyOutreachBatchSchema.extend({
  userId: z.number()
});

export const insertDailyOutreachItemSchema = dailyOutreachItemSchema;

export const insertUserOutreachPreferencesSchema = userOutreachPreferencesSchema.extend({
  userId: z.number()
});

export const insertSenderProfileSchema = senderProfileSchema.extend({
  userId: z.number()
});

export const insertTargetCustomerProfileSchema = targetCustomerProfileSchema.extend({
  userId: z.number()
});

export const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  status: z.enum(["draft", "active", "paused", "completed"]).default("draft"),
  senderProfileId: z.number().optional(),
  productId: z.number().optional(),
  targetCustomerProfileId: z.number().optional(),
  durationDays: z.number().default(14),
  dailyLeadTarget: z.number().default(5)
});

export const insertCampaignSchema = campaignSchema.extend({
  userId: z.number()
});

export const insertStrategicProfileSchema = strategicProfileSchema.extend({
  userId: z.number()
});

export const insertOnboardingChatSchema = onboardingChatSchema.extend({
  userId: z.number()
});

/* INACTIVE FEATURE TYPES - EMAIL CONVERSATIONS, WEBHOOKS & PROSPECT DELIVERIES
export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type ProspectDelivery = typeof prospectDeliveries.$inferSelect;
export type InsertProspectDelivery = z.infer<typeof insertProspectDeliverySchema>;
*/

// Strategic onboarding types
export type DailyOutreachBatch = typeof dailyOutreachBatches.$inferSelect;
export type InsertDailyOutreachBatch = z.infer<typeof insertDailyOutreachBatchSchema>;
export type DailyOutreachItem = typeof dailyOutreachItems.$inferSelect;
export type InsertDailyOutreachItem = z.infer<typeof insertDailyOutreachItemSchema>;
export type UserOutreachPreferences = typeof userOutreachPreferences.$inferSelect;
export type InsertUserOutreachPreferences = z.infer<typeof insertUserOutreachPreferencesSchema>;

export type SenderProfile = typeof senderProfiles.$inferSelect;
export type InsertSenderProfile = z.infer<typeof insertSenderProfileSchema>;
export type TargetCustomerProfile = typeof targetCustomerProfiles.$inferSelect;
export type InsertTargetCustomerProfile = z.infer<typeof insertTargetCustomerProfileSchema>;
export type StrategicProfile = typeof strategicProfiles.$inferSelect;
export type InsertStrategicProfile = z.infer<typeof insertStrategicProfileSchema>;
export type OnboardingChat = typeof onboardingChats.$inferSelect;
export type InsertOnboardingChat = z.infer<typeof insertOnboardingChatSchema>;



