var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import passport from 'passport';
// @ts-ignore: no type definitions for 'passport-github2'
import { Strategy as GitHubStrategy } from 'passport-github2';
import { storage } from "./storage";
import session from 'express-session';
// Check if GitHub secrets are available
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback';
export function setupGithubAuth(app) {
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
    }, (accessToken, refreshToken, profile, done) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        try {
            // Find or create user
            let user = yield storage.getUserByGithubId(profile.id);
            if (!user) {
                // Create a new user with GitHub profile info
                user = yield storage.createUser({
                    username: profile.username || profile.displayName,
                    email: ((_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || '',
                    githubId: profile.id,
                    profileImageUrl: (_d = (_c = profile.photos) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value,
                    // No password needed for OAuth users
                    password: '',
                    // Remove or comment out the 'company' property if not present in Feed type
                    // company: profile.company || null,
                    role: 'user'
                });
            }
            else {
                // Update user's GitHub info
                yield storage.updateUser(user.id, {
                    username: profile.username || profile.displayName,
                    email: ((_f = (_e = profile.emails) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.value) || user.email,
                    profileImageUrl: ((_h = (_g = profile.photos) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.value) || user.profileImageUrl,
                    githubToken: accessToken
                });
            }
            // Store GitHub token
            yield storage.storeGithubToken(user.id, accessToken);
            return done(null, user);
        }
        catch (error) {
            console.error('Error during GitHub authentication:', error);
            return done(error);
        }
    })));
    // Serialize and deserialize user for sessions
    passport.serializeUser((user, done) => {
        done(null, user.id);
    });
    passport.deserializeUser((id, done) => __awaiter(this, void 0, void 0, function* () {
        try {
            const user = yield storage.getUser(id);
            done(null, user);
        }
        catch (error) {
            done(error);
        }
    }));
    // GitHub auth routes
    app.get('/api/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
    app.get('/api/auth/github/callback', passport.authenticate('github', {
        failureRedirect: '/login',
        successRedirect: '/'
    }));
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
            const _a = req.user, { password } = _a, userWithoutPassword = __rest(_a, ["password"]);
            res.json(userWithoutPassword);
        }
        else {
            res.status(401).json({ message: 'Not authenticated' });
        }
    });
}
// Middleware to check if user is authenticated
export function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Authentication required' });
}
// GitHub repository validation middleware
export function validateGithubRepo(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            const user = req.user;
            if (!user.githubToken) {
                return res.status(401).json({ message: 'GitHub authentication required' });
            }
            // The repo parameter should be in the format 'owner/repo'
            const repoPath = req.body.repo || req.query.repo;
            if (!repoPath) {
                return res.status(400).json({ message: 'Repository path is required' });
            }
            // Validate repository access using the GitHub API
            const githubResponse = yield fetch(`https://api.github.com/repos/${repoPath}`, {
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
                    details: yield githubResponse.text()
                });
            }
            const repoData = yield githubResponse.json();
            // Add repo data to the request for use in the route handler
            req.githubRepo = repoData;
            next();
        }
        catch (error) {
            console.error('Error validating GitHub repository:', error);
            res.status(500).json({ message: 'Error validating GitHub repository' });
        }
    });
}
