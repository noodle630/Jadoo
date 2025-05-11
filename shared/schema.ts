import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  role: text("role"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Feed schema - this represents a data feed the user has processed
export const feeds = pgTable("feeds", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  source: text("source").notNull(), // 'csv' or 'api'
  sourceDetails: jsonb("source_details"), // file name, API endpoint, etc.
  marketplace: text("marketplace").notNull(), // 'amazon', 'walmart', etc.
  status: text("status").notNull(), // 'processing', 'completed', 'failed', 'warning'
  itemCount: integer("item_count"),
  processedAt: timestamp("processed_at").defaultNow(),
  aiChanges: jsonb("ai_changes"), // record of what AI changed
  outputUrl: text("output_url"), // where the processed feed is stored
});

export const insertFeedSchema = createInsertSchema(feeds).omit({
  id: true,
  processedAt: true,
});

// Template schema - marketplace templates for feed generation
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  marketplace: text("marketplace").notNull(),
  categories: jsonb("categories").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  usageCount: integer("usage_count").default(0),
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  lastUpdated: true,
  usageCount: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Feed = typeof feeds.$inferSelect;
export type InsertFeed = z.infer<typeof insertFeedSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

// Define marketplace types for validation
export const marketplaceEnum = z.enum([
  'amazon', 
  'walmart', 
  'meta', 
  'tiktok', 
  'etsy', 
  'ebay',
  'shopify'
]);

export type Marketplace = z.infer<typeof marketplaceEnum>;

// Define feed status types for validation
export const feedStatusEnum = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'warning'
]);

export type FeedStatus = z.infer<typeof feedStatusEnum>;

// Define feed source types for validation
export const feedSourceEnum = z.enum(['csv', 'api']);
export type FeedSource = z.infer<typeof feedSourceEnum>;
