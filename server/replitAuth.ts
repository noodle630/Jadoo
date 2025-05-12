import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Ensure we have required environment variables
if (!process.env.REPLIT_DOMAINS) {
  console.warn("Environment variable REPLIT_DOMAINS not provided. Replit Auth will not work correctly.");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // For development, use in-memory store
  // For production, use PostgreSQL store
  if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL) {
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
    });
    
    return session({
      secret: process.env.SESSION_SECRET || "development-session-secret",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: sessionTtl,
        sameSite: 'lax'
      },
    });
  } else {
    console.log("Using in-memory session store for development");
    
    return session({
      secret: process.env.SESSION_SECRET || "development-session-secret",
      resave: true,
      saveUninitialized: true,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: sessionTtl,
        sameSite: 'lax'
      },
    });
  }
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Find existing user by Replit ID (sub claim)
  const existingUser = await storage.getUserByReplitId(claims['sub']);
  
  if (existingUser) {
    // Update existing user
    return await storage.updateUser(existingUser.id, {
      email: claims['email'] || existingUser.email,
      firstName: claims['first_name'] || existingUser.firstName,
      lastName: claims['last_name'] || existingUser.lastName,
      profileImageUrl: claims['profile_image_url'] || existingUser.profileImageUrl,
      lastLogin: new Date()
    });
  } else {
    // Create new user
    return await storage.createUser({
      replitId: claims['sub'],
      email: claims['email'] || `user-${claims['sub']}@replit.com`,
      firstName: claims['first_name'],
      lastName: claims['last_name'],
      profileImageUrl: claims['profile_image_url'],
      username: claims['email'] ? claims['email'].split('@')[0] : `replit-${claims['sub']}`,
      lastLogin: new Date(),
      isActive: true
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only proceed if we have the required environment variables
  if (!process.env.REPLIT_DOMAINS || !process.env.REPL_ID) {
    console.warn("Replit Auth not fully configured. Missing required environment variables.");
    return;
  }

  try {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      try {
        const user = {};
        updateUserSession(user, tokens);
        const dbUser = await upsertUser(tokens.claims());
        
        if (!dbUser) {
          throw new Error('Failed to create or retrieve user');
        }
        
        // Combine session user with database user
        const combinedUser = {
          ...user,
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl
        };
        
        verified(null, combinedUser);
      } catch (error) {
        console.error("Error in Replit Auth verify function:", error);
        verified(error as Error);
      }
    };

    // Set up a strategy for each domain
    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/auth/replit/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }

    passport.serializeUser((user: Express.User, cb) => {
      console.log("Serializing user:", user);
      cb(null, user);
    });
    
    passport.deserializeUser((user: Express.User, cb) => {
      console.log("Deserializing user:", user);
      cb(null, user);
    });

    // Login route
    app.get("/api/auth/replit", (req, res, next) => {
      console.log("Starting Replit authentication process");
      console.log(`Hostname: ${req.hostname}`);
      // Use type assertion to access internal passport properties
      const strategies = (passport as any)._strategies || {};
      console.log(`Available strategies: ${Object.keys(strategies).join(', ')}`);
      console.log(`Looking for strategy: replitauth:${req.hostname}`);
      
      // Check if the strategy exists before attempting to authenticate
      if (!strategies[`replitauth:${req.hostname}`]) {
        console.error(`Strategy not found: replitauth:${req.hostname}`);
        return res.status(500).json({ 
          error: "Authentication configuration error", 
          message: "Replit authentication is not properly configured for this domain." 
        });
      }
      
      passport.authenticate(`replitauth:${req.hostname}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    });

    // Callback route
    app.get("/api/auth/replit/callback", (req, res, next) => {
      console.log("Processing Replit auth callback");
      console.log(`Callback hostname: ${req.hostname}`);
      console.log(`Callback query params:`, req.query);
      
      // Check if the strategy exists before attempting to authenticate
      const callbackStrategies = (passport as any)._strategies || {};
      if (!callbackStrategies[`replitauth:${req.hostname}`]) {
        console.error(`Strategy not found for callback: replitauth:${req.hostname}`);
        return res.redirect("/login?error=replit_auth_configuration_error");
      }
      
      passport.authenticate(`replitauth:${req.hostname}`, {
        successRedirect: "/?auth=success",
        failureRedirect: "/login?error=replit_auth_failed",
      })(req, res, next);
    });

    console.log("Replit Auth configured successfully");
  } catch (error) {
    console.error("Error setting up Replit Auth:", error);
  }
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if token is expired
  if (user.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    
    // If token is still valid, proceed
    if (now <= user.expires_at) {
      return next();
    }

    // If token expired and we have a refresh token, try to refresh
    const refreshToken = user.refresh_token;
    if (refreshToken) {
      try {
        const config = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
        updateUserSession(user, tokenResponse);
        return next();
      } catch (error) {
        console.error("Error refreshing token:", error);
        return res.status(401).json({ message: "Session expired" });
      }
    }
  }

  // If we made it here, the user is authenticated
  next();
};