var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
export class MemStorage {
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
            name: "", // Empty name to test our fallback
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
            name: "", // Empty name to test our fallback
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
            name: "", // Empty name to test our fallback
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
            name: "", // Empty name to test our fallback
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
            name: "", // Empty name to test our fallback
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
    getUser(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.users.get(id);
        });
    }
    getUserByUsername(username) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.users.values()).find((user) => { var _a; return ((_a = user.username) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === username.toLowerCase(); });
        });
    }
    getUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.users.values()).find((user) => user.email.toLowerCase() === email.toLowerCase());
        });
    }
    getUserByGoogleId(googleId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.users.values()).find((user) => user.googleId === googleId);
        });
    }
    createUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.userId++;
            const now = new Date();
            const newUser = Object.assign(Object.assign({}, user), { id, createdAt: now, firstName: user.firstName || null, lastName: user.lastName || null, username: user.username || null, password: user.password || null, email: user.email || "", companyName: user.companyName || null, role: user.role || "user", googleId: user.googleId || null, googleToken: user.googleToken || null, githubId: user.githubId || null, githubToken: user.githubToken || null, replitId: user.replitId || null, profileImageUrl: user.profileImageUrl || null, lastLogin: user.lastLogin || now, isActive: user.isActive !== undefined ? user.isActive : true });
            this.users.set(id, newUser);
            return newUser;
        });
    }
    // Feed operations
    getFeed(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.feeds.get(id);
        });
    }
    getFeedsByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.feeds.values())
                .filter(feed => feed.userId === userId)
                .sort((a, b) => { var _a, _b; return new Date((_a = b.processedAt) !== null && _a !== void 0 ? _a : '').getTime() - new Date((_b = a.processedAt) !== null && _b !== void 0 ? _b : '').getTime(); });
        });
    }
    createFeed(feed) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d;
            const id = this.feedId++;
            const now = new Date();
            // Make sure feed has a name if it's empty or undefined
            const feedName = feed.name && feed.name.trim() !== "" ? feed.name : `Untitled Feed ${id}`;
            const newFeed = Object.assign(Object.assign({}, feed), { id, name: feedName, processedAt: now, sourceDetails: (_a = feed.sourceDetails) !== null && _a !== void 0 ? _a : {}, aiChanges: (_b = feed.aiChanges) !== null && _b !== void 0 ? _b : {}, outputUrl: (_c = feed.outputUrl) !== null && _c !== void 0 ? _c : null, itemCount: (_d = feed.itemCount) !== null && _d !== void 0 ? _d : null });
            this.feeds.set(id, newFeed);
            return newFeed;
        });
    }
    updateFeed(id, feedUpdate) {
        return __awaiter(this, void 0, void 0, function* () {
            const feed = this.feeds.get(id);
            if (!feed)
                return undefined;
            // If name is being updated but is empty, use fallback
            if ('name' in feedUpdate && (!feedUpdate.name || feedUpdate.name.trim() === "")) {
                feedUpdate.name = `Untitled Feed ${id}`;
            }
            const updatedFeed = Object.assign(Object.assign({}, feed), feedUpdate);
            this.feeds.set(id, updatedFeed);
            return updatedFeed;
        });
    }
    deleteFeed(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.feeds.delete(id);
        });
    }
    // Template operations
    getTemplate(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.templates.get(id);
        });
    }
    getTemplatesByUserId(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            return Array.from(this.templates.values())
                .filter(template => template.userId === userId);
        });
    }
    createTemplate(template) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.templateId++;
            const now = new Date();
            const newTemplate = Object.assign(Object.assign({}, template), { id, lastUpdated: now, usageCount: 0 });
            this.templates.set(id, newTemplate);
            return newTemplate;
        });
    }
    updateTemplate(id, templateUpdate) {
        return __awaiter(this, void 0, void 0, function* () {
            const template = this.templates.get(id);
            if (!template)
                return undefined;
            const now = new Date();
            const updatedTemplate = Object.assign(Object.assign(Object.assign({}, template), templateUpdate), { lastUpdated: now });
            this.templates.set(id, updatedTemplate);
            return updatedTemplate;
        });
    }
    deleteTemplate(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.templates.delete(id);
        });
    }
    incrementTemplateUsage(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const template = this.templates.get(id);
            if (!template)
                return false;
            if (template.usageCount == null)
                template.usageCount = 0;
            template.usageCount += 1;
            this.templates.set(id, template);
            return true;
        });
    }
    // GitHub authentication related methods
    getUserByGithubId(githubId) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const user of this.users.values()) {
                if (user.githubId === githubId) {
                    return user;
                }
            }
            return undefined;
        });
    }
    getUserByReplitId(replitId) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const user of this.users.values()) {
                if (user.replitId === replitId) {
                    return user;
                }
            }
            return undefined;
        });
    }
    updateUser(id, updateData) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.getUser(id);
            if (!user) {
                return undefined;
            }
            const updatedUser = Object.assign(Object.assign({}, user), updateData);
            this.users.set(id, updatedUser);
            return updatedUser;
        });
    }
    storeGithubToken(userId, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.getUser(userId);
            if (!user) {
                return false;
            }
            this.githubTokens.set(userId, token);
            // Also update the user object with the token
            yield this.updateUser(userId, { githubToken: token });
            return true;
        });
    }
    storeGoogleToken(userId, token) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.getUser(userId);
            if (!user) {
                return false;
            }
            // Update the user object with the token
            yield this.updateUser(userId, { googleToken: token });
            return true;
        });
    }
    // GitHub repository operations
    linkRepoToFeed(feedId, repoInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const feed = yield this.getFeed(feedId);
            if (!feed) {
                return false;
            }
            this.githubRepos.set(feedId, repoInfo);
            return true;
        });
    }
    getRepoByFeedId(feedId) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.githubRepos.get(feedId);
        });
    }
}
export const storage = new MemStorage();
