import { 
  users, type User, type InsertUser,
  feeds, type Feed, type InsertFeed,
  templates, type Template, type InsertTemplate
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  createUser(user: Partial<User>): Promise<User>;
  updateUser(id: number, updateData: Partial<User>): Promise<User | undefined>;
  storeGoogleToken(userId: number, token: string): Promise<boolean>;
  storeGithubToken(userId: number, token: string): Promise<boolean>;
  
  // Feed operations
  getFeed(id: number): Promise<Feed | undefined>;
  getFeedsByUserId(userId: number): Promise<Feed[]>;
  createFeed(feed: InsertFeed): Promise<Feed>;
  updateFeed(id: number, feed: Partial<Feed>): Promise<Feed | undefined>;
  deleteFeed(id: number): Promise<boolean>;
  
  // Template operations
  getTemplate(id: number): Promise<Template | undefined>;
  getTemplatesByUserId(userId: number): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, template: Partial<Template>): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<boolean>;
  incrementTemplateUsage(id: number): Promise<boolean>;
  
  // GitHub repository operations
  linkRepoToFeed(feedId: number, repoInfo: any): Promise<boolean>;
  getRepoByFeedId(feedId: number): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private feeds: Map<number, Feed>;
  private templates: Map<number, Template>;
  private githubTokens: Map<number, string>; // userId -> token
  private githubRepos: Map<number, any>; // feedId -> repo info
  private userId: number;
  private feedId: number;
  private templateId: number;

  constructor() {
    this.users = new Map();
    this.feeds = new Map();
    this.templates = new Map();
    this.githubTokens = new Map();
    this.githubRepos = new Map();
    this.userId = 1;
    this.feedId = 1;
    this.templateId = 1;
    
    // Add a demo user
    this.createUser({
      username: "demo",
      password: "password123",
      email: "demo@example.com",
      companyName: "Demo Company",
      firstName: "Demo",
      lastName: "User",
      role: "user"
    });
    
    // Add some sample templates
    this.createTemplate({
      userId: 1,
      name: "Amazon Template",
      marketplace: "amazon",
      categories: ["Electronics", "Apparel", "Home", "Beauty", "Sports", "Toys", "Books", "Food", "Health", "Automotive", "Garden", "Pet"],
    });
    
    this.createTemplate({
      userId: 1,
      name: "Walmart Template",
      marketplace: "walmart",
      categories: ["Home", "Kitchen", "Electronics", "Clothing", "Beauty", "Sports", "Toys", "Office"],
    });
    
    this.createTemplate({
      userId: 1,
      name: "Meta Shops Template",
      marketplace: "meta",
      categories: ["Fashion", "Beauty", "Electronics", "Home", "Accessories"],
    });

    this.createTemplate({
      userId: 1,
      name: "TikTok Shop Template",
      marketplace: "tiktok",
      categories: ["Trendy", "Beauty", "Fashion", "Electronics"],
    });

    // Add some sample feed history
    this.createFeed({
      userId: 1,
      name: "",  // Empty name to test our fallback
      source: "csv",
      sourceDetails: { filename: "summer_collection.csv" },
      marketplace: "amazon",
      status: "completed",
      itemCount: 124,
      aiChanges: {
        titleOptimized: 18,
        categoryCorrected: 5,
        descriptionEnhanced: 42,
        pricingFixed: 2
      },
      outputUrl: "/feeds/summer-collection-2023.csv"
    });
    
    this.createFeed({
      userId: 1,
      name: "",  // Empty name to test our fallback
      source: "api",
      sourceDetails: { endpoint: "https://api.example.com/products" },
      marketplace: "walmart",
      status: "failed",
      itemCount: 87,
      aiChanges: null,
      outputUrl: null
    });
    
    this.createFeed({
      userId: 1,
      name: "",  // Empty name to test our fallback
      source: "csv",
      sourceDetails: { filename: "holiday_promotions.csv" },
      marketplace: "meta",
      status: "completed",
      itemCount: 56,
      aiChanges: {
        titleOptimized: 12,
        categoryCorrected: 8,
        descriptionEnhanced: 28,
        pricingFixed: 0
      },
      outputUrl: "/feeds/holiday-promotions.csv"
    });
    
    this.createFeed({
      userId: 1,
      name: "",  // Empty name to test our fallback
      source: "api",
      sourceDetails: { endpoint: "https://api.inventory.com/spring" },
      marketplace: "tiktok",
      status: "completed",
      itemCount: 73,
      aiChanges: {
        titleOptimized: 22,
        categoryCorrected: 15,
        descriptionEnhanced: 35,
        pricingFixed: 3
      },
      outputUrl: "/feeds/spring-apparel.csv"
    });
    
    this.createFeed({
      userId: 1,
      name: "",  // Empty name to test our fallback
      source: "csv",
      sourceDetails: { filename: "home_decor.csv" },
      marketplace: "etsy",
      status: "warning",
      itemCount: 42,
      aiChanges: {
        titleOptimized: 12,
        categoryCorrected: 5,
        descriptionEnhanced: 20,
        pricingFixed: 0
      },
      outputUrl: "/feeds/home-decor.csv"
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username?.toLowerCase() === username.toLowerCase(),
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId
    );
  }

  async createUser(user: Partial<User>): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const newUser: User = { 
      ...user, 
      id, 
      createdAt: now,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      username: user.username || null,
      password: user.password || null,
      email: user.email || "",
      companyName: user.companyName || null,
      role: user.role || "user",
      googleId: user.googleId || null,
      googleToken: user.googleToken || null,
      githubId: user.githubId || null,
      githubToken: user.githubToken || null,
      profileImageUrl: user.profileImageUrl || null,
      lastLogin: user.lastLogin || now,
      isActive: user.isActive !== undefined ? user.isActive : true
    };
    this.users.set(id, newUser);
    return newUser;
  }

  // Feed operations
  async getFeed(id: number): Promise<Feed | undefined> {
    return this.feeds.get(id);
  }

  async getFeedsByUserId(userId: number): Promise<Feed[]> {
    return Array.from(this.feeds.values())
      .filter(feed => feed.userId === userId)
      .sort((a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime());
  }

  async createFeed(feed: InsertFeed): Promise<Feed> {
    const id = this.feedId++;
    const now = new Date();
    // Make sure feed has a name if it's empty or undefined
    const feedName = feed.name && feed.name.trim() !== "" ? feed.name : `Untitled Feed ${id}`;
    const newFeed: Feed = { ...feed, id, name: feedName, processedAt: now };
    this.feeds.set(id, newFeed);
    return newFeed;
  }

  async updateFeed(id: number, feedUpdate: Partial<Feed>): Promise<Feed | undefined> {
    const feed = this.feeds.get(id);
    if (!feed) return undefined;
    
    // If name is being updated but is empty, use fallback
    if ('name' in feedUpdate && (!feedUpdate.name || feedUpdate.name.trim() === "")) {
      feedUpdate.name = `Untitled Feed ${id}`;
    }
    
    const updatedFeed = { ...feed, ...feedUpdate };
    this.feeds.set(id, updatedFeed);
    return updatedFeed;
  }

  async deleteFeed(id: number): Promise<boolean> {
    return this.feeds.delete(id);
  }

  // Template operations
  async getTemplate(id: number): Promise<Template | undefined> {
    return this.templates.get(id);
  }

  async getTemplatesByUserId(userId: number): Promise<Template[]> {
    return Array.from(this.templates.values())
      .filter(template => template.userId === userId);
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const id = this.templateId++;
    const now = new Date();
    const newTemplate: Template = { 
      ...template, 
      id, 
      lastUpdated: now,
      usageCount: 0
    };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async updateTemplate(id: number, templateUpdate: Partial<Template>): Promise<Template | undefined> {
    const template = this.templates.get(id);
    if (!template) return undefined;
    
    const now = new Date();
    const updatedTemplate = { 
      ...template, 
      ...templateUpdate, 
      lastUpdated: now 
    };
    this.templates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteTemplate(id: number): Promise<boolean> {
    return this.templates.delete(id);
  }

  async incrementTemplateUsage(id: number): Promise<boolean> {
    const template = this.templates.get(id);
    if (!template) return false;
    
    template.usageCount += 1;
    this.templates.set(id, template);
    return true;
  }
  
  // GitHub authentication related methods
  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.githubId === githubId) {
        return user;
      }
    }
    return undefined;
  }
  
  async updateUser(id: number, updateData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) {
      return undefined;
    }
    
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }
  
  async storeGithubToken(userId: number, token: string): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user) {
      return false;
    }
    
    this.githubTokens.set(userId, token);
    
    // Also update the user object with the token
    await this.updateUser(userId, { githubToken: token });
    
    return true;
  }
  
  // GitHub repository operations
  async linkRepoToFeed(feedId: number, repoInfo: any): Promise<boolean> {
    const feed = await this.getFeed(feedId);
    if (!feed) {
      return false;
    }
    
    this.githubRepos.set(feedId, repoInfo);
    return true;
  }
  
  async getRepoByFeedId(feedId: number): Promise<any> {
    return this.githubRepos.get(feedId);
  }
}

export const storage = new MemStorage();
