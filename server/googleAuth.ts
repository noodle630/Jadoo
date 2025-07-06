import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler, Request } from "express";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { z } from "zod";

const SESSION_SECRET = process.env.SESSION_SECRET || "development-secret";

// Get the app URL from environment or use a default
// IMPORTANT: This must match the authorized redirect URI in Google OAuth console
const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
const APP_URL = process.env.APP_URL || `https://${replitDomain}`;
console.log("Using callback URL:", `${APP_URL}/api/auth/google/callback`);

// Validate Google client credentials are set
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.");
}

// Log important configuration details for debugging
console.log(`App URL: ${APP_URL}`);
console.log(`Node Environment: ${process.env.NODE_ENV}`);
console.log(`Replit Domain: ${process.env.REPLIT_DOMAINS}`);

// Configure session management
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  console.log("Setting up session management");
  console.log("Database URL exists:", !!process.env.DATABASE_URL);
  
  // For development, just use the default in-memory store
  console.log("Using default in-memory session store for development");
  
  return session({
    secret: SESSION_SECRET,
    // Default memory store is used - no need to specify
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to create session for all users
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      maxAge: sessionTtl,
      sameSite: 'lax'
    },
  });
}

// Upsert user in database based on Google profile
async function upsertGoogleUser(profile: any, accessToken: string) {
  try {
    console.log("Processing Google profile:", profile.id);
    
    // Extract user data from Google profile
    const userData = {
      googleId: profile.id,
      email: profile.emails?.[0]?.value || "",
      firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || null,
      lastName: profile.name?.familyName || null,
      profileImageUrl: profile.photos?.[0]?.value || null,
      lastLogin: new Date(),
      googleToken: accessToken,
    };

    console.log(`Google profile data extracted: ${userData.email} (${userData.firstName} ${userData.lastName})`);

    // Find if user exists by Google ID
    const existingUserByGoogleId = await storage.getUserByGoogleId(userData.googleId);

    // If found by Google ID, update and return
    if (existingUserByGoogleId) {
      console.log(`User found by Google ID: ${existingUserByGoogleId.id}`);
      const updatedUser = await storage.updateUser(existingUserByGoogleId.id, {
        ...userData,
        lastLogin: new Date(),
      });
      
      // Add null check for TypeScript
      if (!updatedUser) {
        console.error(`Failed to update user with ID: ${existingUserByGoogleId.id}`);
        // Fall back to returning the existing user if update fails
        return existingUserByGoogleId;
      }
      
      console.log(`User updated: ${updatedUser.id}`);
      return updatedUser;
    }

    // Check if user exists by email (might have registered with email/password)
    if (userData.email) {
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      
      if (existingUserByEmail) {
        console.log(`User found by email: ${existingUserByEmail.id}`);
        // Link Google ID to existing account
        const updatedUser = await storage.updateUser(existingUserByEmail.id, {
          ...userData,
          googleId: userData.googleId,
          lastLogin: new Date(),
        });
        
        // Add null check for TypeScript
        if (!updatedUser) {
          console.error(`Failed to update user with ID: ${existingUserByEmail.id}`);
          // Fall back to returning the existing user if update fails
          return existingUserByEmail;
        }
        
        console.log(`Linked Google ID to existing account: ${updatedUser.id}`);
        return updatedUser;
      }
    }

    // Create new user if not found
    console.log("Creating new user account from Google profile");
    const newUser = await storage.createUser({
      ...userData,
      username: userData.email.split('@')[0], // Create a default username from email
      isActive: true,
    });
    console.log(`New user created: ${newUser.id}`);
    return newUser;
  } catch (error) {
    console.error("Error upserting Google user:", error);
    throw error;
  }
}

// Set up Google authentication and related routes
export async function setupGoogleAuth(app: Express) {
  console.log('[GOOGLE AUTH] setupGoogleAuth called');
  console.log('[GOOGLE AUTH] process.env.GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);
  console.log('[GOOGLE AUTH] process.env.GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET);
  console.log('[GOOGLE AUTH] process.env.GOOGLE_CALLBACK_URL:', process.env.GOOGLE_CALLBACK_URL);
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
    console.log('[GOOGLE AUTH] Credentials found, registering GoogleStrategy and routes');
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        scope: ['profile', 'email']
      },
      (accessToken, refreshToken, profile, done) => {
        console.log('[GOOGLE AUTH] GoogleStrategy callback called');
        console.log('[GOOGLE AUTH] Profile:', profile);
        return done(null, profile);
      }
    ));

    app.get('/api/auth/google', (req, res, next) => {
      console.log('[GOOGLE AUTH] /api/auth/google route hit');
      next();
    }, passport.authenticate('google', { scope: ['profile', 'email'] }));

    app.get('/api/auth/google/callback', (req, res, next) => {
      console.log('[GOOGLE AUTH] /api/auth/google/callback route hit');
      next();
    }, passport.authenticate('google', { failureRedirect: '/' }), (req, res) => {
      console.log('[GOOGLE AUTH] Google callback success, user:', req.user);
      res.redirect('/');
    });

    console.log('[GOOGLE AUTH] Google authentication routes configured');
  } else {
    console.log('[GOOGLE AUTH] GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_CALLBACK_URL not set, skipping Google auth route registration');
  }

  // User info route - returns current user data
  app.get("/api/auth/user", async (req: any, res) => {
    try {
      console.log("GET /api/auth/user - Auth status:", req.isAuthenticated());
      console.log("GET /api/auth/user - Session:", req.session);
      console.log("GET /api/auth/user - User in request:", req.user);
      
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.user?.id;
      if (!userId) {
        console.error("User ID missing from authenticated session:", req.user);
        return res.status(401).json({ message: "Invalid user session" });
      }

      console.log(`Getting full profile for user ID: ${userId}`);

      // Get full user profile from database
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User with ID ${userId} not found in database`);
        req.logout(() => {
          console.log("Logging out user with invalid ID");
        });
        return res.status(401).json({ message: "User not found" });
      }

      // Don't send sensitive information to client
      const { password, googleToken, githubToken, ...safeUser } = user;
      
      console.log(`Successfully returning user profile for ${user.email}`);
      
      // Log the actual response for debugging
      const responseData = {
        ...safeUser,
        isAuthenticated: true,
        lastAccessedAt: new Date()
      };
      
      console.log("Sending user data:", JSON.stringify(responseData));
      res.json(responseData);
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
      console.log("Processing login request");
      // Validate login data
      const loginSchema = z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
      });

      const validatedData = loginSchema.parse(req.body);
      console.log(`Login attempt for email: ${validatedData.email}`);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.password) {
        console.log(`User not found or has no password: ${validatedData.email}`);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log(`User found, verifying password for: ${user.email} (ID: ${user.id})`);

      // Verify password
      const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordMatch) {
        console.log("Password verification failed");
        return res.status(401).json({ message: "Invalid email or password" });
      }

      console.log("Password verified successfully");

      // Log user in by creating a session
      req.login(user, async (err) => {
        if (err) {
          console.error("Error during login session creation:", err);
          return res.status(500).json({ message: "Failed to login" });
        }

        console.log(`User logged in successfully: ${user.email} (ID: ${user.id})`);

        // Update last login time
        await storage.updateUser(user.id, { lastLogin: new Date() });
        
        // Remove sensitive data from response
        const { password, googleToken, githubToken, ...userWithoutSensitiveData } = user;
        
        console.log("Returning successful login response");
        return res.json({ 
          user: userWithoutSensitiveData,
          message: "Login successful" 
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
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