CREATE TABLE "feeds" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"source" text NOT NULL,
	"source_details" jsonb,
	"marketplace" text NOT NULL,
	"status" text NOT NULL,
	"item_count" integer,
	"processed_at" timestamp DEFAULT now(),
	"ai_changes" jsonb,
	"output_url" text
);
--> statement-breakpoint
CREATE TABLE "github_repositories" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"repo_name" text NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_url" text NOT NULL,
	"branch" text DEFAULT 'main',
	"path" text DEFAULT '/',
	"last_sync" timestamp,
	"auto_sync" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "github_repositories_feed_id_unique" UNIQUE("feed_id")
);
--> statement-breakpoint
CREATE TABLE "logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"feed_id" text NOT NULL,
	"row_number" integer NOT NULL,
	"status" text NOT NULL,
	"confidence" text NOT NULL,
	"original_data" jsonb,
	"transformed_data" jsonb,
	"error_message" text,
	"processing_time_ms" integer,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"parent_id" integer,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sku" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"brand" text,
	"category" text,
	"image_url" text,
	"additional_images" jsonb DEFAULT '[]'::jsonb,
	"price" real,
	"sale_price" real,
	"cost" real,
	"quantity" integer DEFAULT 0,
	"barcode" text,
	"barcode_type" text,
	"marketplace_data" jsonb DEFAULT '{}'::jsonb,
	"attributes" jsonb DEFAULT '{}'::jsonb,
	"dimensions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'active',
	"variant_of" integer
);
--> statement-breakpoint
CREATE TABLE "products_to_categories" (
	"product_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	CONSTRAINT "products_to_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"marketplace" text NOT NULL,
	"categories" jsonb NOT NULL,
	"last_updated" timestamp DEFAULT now(),
	"usage_count" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"username" text,
	"password" text,
	"email" text NOT NULL,
	"company_name" text,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	"google_id" text,
	"google_token" text,
	"github_id" text,
	"github_token" text,
	"replit_id" text,
	"profile_image_url" text,
	"last_login" timestamp,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id"),
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_replit_id_unique" UNIQUE("replit_id")
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" real NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" real DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
);
