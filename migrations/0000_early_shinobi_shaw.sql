CREATE TABLE "campaign_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"list_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"campaign_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft',
	"start_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"total_companies" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"list_id" integer,
	"age" integer,
	"size" integer,
	"website" text,
	"alternative_profile_url" text,
	"default_contact_email" text,
	"website_ranking" integer,
	"linkedin_prominence" integer,
	"customer_count" integer,
	"rating" integer,
	"services" text[],
	"validation_points" text[],
	"differentiation" text[],
	"total_score" integer,
	"snapshot" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"feedback_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_id" integer NOT NULL,
	"name" text NOT NULL,
	"role" text,
	"email" text,
	"alternative_emails" text[],
	"probability" integer,
	"linkedin_url" text,
	"twitter_handle" text,
	"phone_number" text,
	"department" text,
	"location" text,
	"verification_source" text,
	"last_enriched" timestamp,
	"name_confidence_score" integer,
	"user_feedback_score" integer,
	"feedback_count" integer DEFAULT 0,
	"last_validated" timestamp,
	"created_at" timestamp DEFAULT now(),
	"completed_searches" text[]
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"list_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"result_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_approaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"order" integer NOT NULL,
	"active" boolean DEFAULT true,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_searches" text[],
	"technical_prompt" text,
	"response_structure" text,
	"module_type" text DEFAULT 'company_overview',
	"validation_rules" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "search_test_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"strategy_id" integer NOT NULL,
	"test_id" uuid NOT NULL,
	"query" text NOT NULL,
	"company_quality" integer NOT NULL,
	"contact_quality" integer NOT NULL,
	"email_quality" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"status" text DEFAULT 'completed',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"has_seen_tour" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" text NOT NULL,
	"search_id" text,
	"source" text NOT NULL,
	"method" text,
	"url" text,
	"headers" jsonb DEFAULT '{}'::jsonb,
	"body" jsonb DEFAULT '{}'::jsonb,
	"status" text DEFAULT 'pending',
	"status_code" integer,
	"processing_details" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "lists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_test_results" ADD CONSTRAINT "search_test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_test_results" ADD CONSTRAINT "search_test_results_strategy_id_search_approaches_id_fk" FOREIGN KEY ("strategy_id") REFERENCES "public"."search_approaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;