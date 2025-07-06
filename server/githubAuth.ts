import passport from 'passport';
// @ts-ignore: no type definitions for 'passport-github2'
import { Strategy as GitHubStrategy } from 'passport-github2';
import { storage } from "./storage";
import session from 'express-session';
import type { Express, Request, Response, NextFunction } from 'express';

// Check if GitHub secrets are available
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';

export function setupGithubAuth(app: Express) {
  // Only setup if GitHub credentials are available
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.warn('GitHub OAuth is not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.');
    return;
  }

  // Session setup for authentication
  app.use(session({
    secret: process.env.SESSION_SECRET || 'datafeed-transform-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure GitHub Strategy
  passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: GITHUB_CALLBACK_URL
  }, async (accessToken: any, refreshToken: any, profile: any, done: any) => {
    try {
      // Find or create user
      let user = await storage.getUserByGithubId(profile.id);
      
      if (!user) {
        // Create a new user with GitHub profile info
        user = await storage.createUser({
          username: profile.username || profile.displayName,
          email: profile.emails?.[0]?.value || '',
          githubId: profile.id,
          profileImageUrl: profile.photos?.[0]?.value,
          // No password needed for OAuth users
          password: '',
          // Remove or comment out the 'company' property if not present in Feed type
          // company: profile.company || null,
          role: 'user'
        });
      } else {
        // Update user's GitHub info
        await storage.updateUser(user.id, {
          username: profile.username || profile.displayName,
          email: profile.emails?.[0]?.value || user.email,
          profileImageUrl: profile.photos?.[0]?.value || user.profileImageUrl,
          githubToken: accessToken
        });
      }
      
      // Store GitHub token
      await storage.storeGithubToken(user.id, accessToken);
      
      return done(null, user);
    } catch (error) {
      console.error('Error during GitHub authentication:', error);
      return done(error as Error);
    }
  }));

  // Serialize and deserialize user for sessions
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // GitHub auth routes
  app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));

  app.get('/api/auth/github/callback', 
    passport.authenticate('github', { 
      failureRedirect: '/login',
      successRedirect: '/'
    })
  );

  // Logout route
  app.get('/api/auth/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });

  // Current user info route
  app.get('/api/auth/user', (req, res) => {
    if (req.isAuthenticated()) {
      // Don't return the password hash
      const { password, ...userWithoutPassword } = req.user as any;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Authentication required' });
}

// GitHub repository validation middleware
export async function validateGithubRepo(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = req.user as any;
    if (!user.githubToken) {
      return res.status(401).json({ message: 'GitHub authentication required' });
    }
    
    // The repo parameter should be in the format 'owner/repo'
    const repoPath = req.body.repo || req.query.repo;
    if (!repoPath) {
      return res.status(400).json({ message: 'Repository path is required' });
    }
    
    // Validate repository access using the GitHub API
    const githubResponse = await fetch(`https://api.github.com/repos/${repoPath}`, {
      headers: {
        'Authorization': `token ${user.githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!githubResponse.ok) {
      if (githubResponse.status === 404) {
        return res.status(404).json({ message: 'Repository not found or no access' });
      }
      return res.status(githubResponse.status).json({ 
        message: 'GitHub API error',
        details: await githubResponse.text()
      });
    }
    
    const repoData = await githubResponse.json();
    
    // Add repo data to the request for use in the route handler
    req.githubRepo = repoData;
    
    next();
  } catch (error) {
    console.error('Error validating GitHub repository:', error);
    res.status(500).json({ message: 'Error validating GitHub repository' });
  }
}