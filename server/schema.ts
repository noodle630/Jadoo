import { pgTable, text, serial, integer, boolean, timestamp, jsonb, real, primaryKey, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  }
);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username").unique(),
  password: text("password"),
  email: text("email").notNull().unique(),
  companyName: text("company_name"),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  
  // OAuth providers
  googleId: text("google_id").unique(),
  googleToken: text("google_token"),
  githubId: text("github_id").unique(),
  githubToken: text("github_token"),
  replitId: text("replit_id").unique(), // Replit user ID for OpenID Connect
  
  // Profile data
  profileImageUrl: text("profile_image_url"),
  lastLogin: timestamp("last_login"),
  isActive: boolean("is_active").default(true),
});

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  feeds: many(feeds),
  templates: many(templates),
}));

// User form schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  isActive: true,
  googleId: true,
  googleToken: true,
  githubId: true,
  githubToken: true
});

// Google OAuth user schema
export const insertGoogleUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
  password: true,
  isActive: true,
  githubId: true,
  githubToken: true
}).extend({
  googleId: z.string().min(1, "Google ID is required")
});

// Registration schema with validation
export const userRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  companyName: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Login schema
export const userLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

// Product schema - represents a product in the vendor's inventory
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  brand: text("brand"),
  category: text("category"),
  imageUrl: text("image_url"),
  additionalImages: jsonb("additional_images").default([]),
  price: real("price"),
  salePrice: real("sale_price"),
  cost: real("cost"),
  quantity: integer("quantity").default(0),
  barcode: text("barcode"), // UPC, EAN, GTIN, etc.
  barcodeType: text("barcode_type"), // UPC, EAN, GTIN, etc.
  marketplaceData: jsonb("marketplace_data").default({}), // Stores marketplace-specific data
  attributes: jsonb("attributes").default({}), // Arbitrary product attributes
  dimensions: jsonb("dimensions").default({}), // height, width, length, weight
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  status: text("status").default("active"), // active, inactive, archived
  variantOf: integer("variant_of"), // For products that are variants of others
});

export const productsRelations = relations(products, ({ one }) => ({
  user: one(users, {
    fields: [products.userId],
    references: [users.id],
  }),
  parent: one(products, {
    fields: [products.variantOf],
    references: [products.id],
  }),
}));

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Product Category schema for organizing products
export const productCategories = pgTable("product_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productCategoriesRelations = relations(productCategories, ({ one }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
  }),
  user: one(users, {
    fields: [productCategories.userId],
    references: [users.id],
  }),
}));

export const insertProductCategorySchema = createInsertSchema(productCategories).omit({
  id: true,
  createdAt: true
});

// Products to categories many-to-many relationship
export const productsToCategories = pgTable("products_to_categories", {
  productId: integer("product_id").notNull(),
  categoryId: integer("category_id").notNull(),
}, (t) => {
  return {
    pk: primaryKey(t.productId, t.categoryId),
  };
});

export const productsToCategoriesRelations = relations(productsToCategories, ({ one }) => ({
  product: one(products, {
    fields: [productsToCategories.productId],
    references: [products.id],
  }),
  category: one(productCategories, {
    fields: [productsToCategories.categoryId],
    references: [productCategories.id],
  }),
}));

// Feed schema - this represents a data feed the user has processed
export const feeds = pgTable("feeds", {
  id: text("id").primaryKey(),
  filename: text("filename"),
  platform: text("platform"),
  status: text("status"),
  upload_time: timestamp("upload_time"),
  row_count: integer("row_count"),
  output_path: text("output_path"),
  log_path: text("log_path"),
  summary_json: jsonb("summary_json"),
  input_path: text("input_path"),
  category: text("category"),
  email: text("email"),
  message: text("message"),
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

export const templatesRelations = relations(templates, ({ one }) => ({
  user: one(users, {
    fields: [templates.userId],
    references: [users.id],
  }),
}));

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  lastUpdated: true,
  usageCount: true
});

// Logs table for tracking transformation results
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  feed_id: text("feed_id").notNull(),
  row_number: integer("row_number").notNull(),
  status: text("status").notNull(), // 'SUCCESS', 'ERROR', 'PARTIAL'
  confidence: text("confidence").notNull(), // 'green', 'yellow', 'red'
  original_data: jsonb("original_data"),
  transformed_data: jsonb("transformed_data"),
  error_message: text("error_message"),
  processing_time_ms: integer("processing_time_ms"),
  retry_count: integer("retry_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

export const logsRelations = relations(logs, ({ one }) => ({
  feed: one(feeds, {
    fields: [logs.feed_id],
    references: [feeds.id],
  }),
}));

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  created_at: true,
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertGoogleUser = z.infer<typeof insertGoogleUserSchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

// Define marketplace types for validation
export const marketplaceEnum = z.enum([
  'amazon', 
  'walmart', 
  'meta',
  'tiktok',
  'catch',
  'reebelo',
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

// Define product status types for validation
export const productStatusEnum = z.enum(['active', 'inactive', 'archived']);
export type ProductStatus = z.infer<typeof productStatusEnum>;

// GitHub repositories linked to feeds
export const githubRepositories = pgTable("github_repositories", {
  id: serial("id").primaryKey(),
  feedId: integer("feed_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  repoName: text("repo_name").notNull(),
  repoOwner: text("repo_owner").notNull(),
  repoUrl: text("repo_url").notNull(),
  branch: text("branch").default("main"),
  path: text("path").default("/"),
  lastSync: timestamp("last_sync"),
  autoSync: boolean("auto_sync").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const githubRepositoriesRelations = relations(githubRepositories, ({ one }) => ({
  feed: one(feeds, {
    fields: [githubRepositories.feedId],
    references: [feeds.id],
  }),
  user: one(users, {
    fields: [githubRepositories.userId],
    references: [users.id],
  }),
}));

export const insertGithubRepositorySchema = createInsertSchema(githubRepositories).omit({
  id: true,
  createdAt: true,
  lastSync: true,
});

export type GithubRepository = typeof githubRepositories.$inferSelect;
export type InsertGithubRepository = z.infer<typeof insertGithubRepositorySchema>;

// --- Wallet and Transactions ---
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  balance: real("balance").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(), // 'credit' or 'debit'
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = typeof wallets.$inferInsert;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = typeof walletTransactions.$inferInsert;
