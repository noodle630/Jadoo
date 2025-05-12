import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler, Request } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { z } from "zod";

const SESSION_SECRET = process.env.SESSION_SECRET || "development-secret";

// Validate Google client credentials are set
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
}

// Configure session management
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions", // Will create this table if needed
  });
  
  return session({
    secret: SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

// Upsert user in database based on Google profile
async function upsertGoogleUser(profile: any, accessToken: string) {
  try {
    // Extract user data from Google profile
    const userData = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value || "",
      firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || null,
      lastName: profile.name?.familyName || null,
      profileImageUrl: profile.photos?.[0]?.value || null,
      lastLogin: new Date(),
    };

    // Find if user exists by Google ID
    const existingUserByGoogleId = await storage.getUserByGoogleId(userData.googleId);

    // If found by Google ID, update and return
    if (existingUserByGoogleId) {
      return await storage.updateUser(existingUserByGoogleId.id, {
        ...userData,
        lastLogin: new Date(),
      });
    }

    // Check if user exists by email (might have registered with email/password)
    if (userData.email) {
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      
      if (existingUserByEmail) {
        // Link Google ID to existing account
        return await storage.updateUser(existingUserByEmail.id, {
          ...userData,
          googleId: userData.googleId,
          lastLogin: new Date(),
        });
      }
    }

    // Create new user if not found
    return await storage.createUser({
      ...userData,
      username: userData.email.split('@')[0], // Create a default username from email
      isActive: true,
    });
  } catch (error) {
    console.error("Error upserting Google user:", error);
    throw error;
  }
}

// Set up Google authentication and related routes
export async function setupGoogleAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Only set up Google auth if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    // Set up the Google strategy
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.APP_URL || "http://localhost:5000"}/api/auth/google/callback`,
        scope: ['profile', 'email']
      },
      async function(accessToken, refreshToken, profile, done) {
        try {
          const user = await upsertGoogleUser(profile, accessToken);
          done(null, user);
        } catch (error) {
          done(error as Error);
        }
      }
    ));

    passport.serializeUser((user: any, done) => {
      done(null, user.id);
    });
    
    passport.deserializeUser(async (id: number, done) => {
      try {
        const user = await storage.getUser(id);
        if (user) {
          // Remove sensitive information
          const { password, ...userWithoutPassword } = user;
          done(null, userWithoutPassword);
        } else {
          done(new Error('User not found'));
        }
      } catch (error) {
        done(error);
      }
    });

    // Google login route
    app.get(
      "/api/auth/google",
      passport.authenticate("google", {
        scope: ["profile", "email"]
      })
    );

    // Google callback route
    app.get(
      "/api/auth/google/callback",
      passport.authenticate("google", {
        successRedirect: "/dashboard",
        failureRedirect: "/login",
      })
    );

    console.log("Google authentication routes configured");
  }

  // User info route - returns current user data
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Invalid user session" });
      }

      // Get full user profile from database
      const user = await storage.getUser(userId);
      if (!user) {
        req.logout(() => {});
        return res.status(401).json({ message: "User not found" });
      }

      // Don't send sensitive information to client
      const { password, googleToken, githubToken, ...safeUser } = user;
      
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email/password registration route
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Validate registration data
      const registerSchema = z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        companyName: z.string().optional(),
      });

      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      // Create user
      const newUser = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
        username: validatedData.email.split('@')[0], // Create username from email
        isActive: true,
        lastLogin: new Date(),
      });

      // Remove password from response
      const { password, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // Email/password login route
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Validate login data
      const loginSchema = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      });

      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Log user in by creating a session
      req.login(user, async (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to login" });
        }

        // Update last login time
        await storage.updateUser(user.id, { lastLogin: new Date() });
        
        // Remove sensitive data from response
        const { password, googleToken, githubToken, ...userWithoutSensitiveData } = user;
        
        return res.json({ 
          user: userWithoutSensitiveData,
          message: "Login successful" 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        });
      }
      
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout route
  app.get("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Get current user from request helper
export function getCurrentUser(req: Request) {
  if (!req.isAuthenticated()) {
    return null;
  }
  
  return req.user;
}