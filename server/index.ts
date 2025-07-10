// NOTE: This file expects the TypeScript compiler option `module` to be set to 'esnext' or 'node16' for import.meta compatibility.
// If you see linter errors, update your tsconfig.json or tsconfig.server.json accordingly.
import dotenv from 'dotenv';
dotenv.config();

import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('[DEBUG] REDIS_URL at index.ts:', process.env.REDIS_URL);
import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import IORedis from 'ioredis';
import { createSimpleRoutes } from './simple-routes';
import fs from 'fs';
import { feedQueue } from './queue.js';
import jwt from 'jsonwebtoken';
import supabase from "../supabaseClient.js";

let routes: any;
(async () => {
  routes = (await import('./routes')).default;

  // Remove all redeclarations of __filename and __dirname. Use them directly.
  const app = express();
  const port = process.env.PORT || 4000;

  // Test endpoint to verify server is working
  app.get('/api/test', (req: Request, res: Response) => {
    res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
  });

  // Body parsers for non-upload routes (MUST come before endpoints that use req.body)
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS: Allow production, dev (ngrok), and local frontends
  const allowedOrigins = [
    'https://feed-flow-ai-transform.lovable.app', // production FE
    'https://jadoo.fly.dev',                     // direct backend access
    'https://jadoo.ngrok-free.app',              // fixed ngrok dev URL
    'http://localhost:5173',                     // local dev FE
    'http://localhost:3000',                     // (optional) other local FE
    'https://id-preview--e1bdcd3b-9fd5-4cf3-9180-5129081ea9f2.lovable.app', // Added current preview domain
  ];

  // Make isLovablePreview match all preview subdomains
  const isLovablePreview = (origin: string) => {
    // Match any *.lovable.app with 'preview' in the subdomain
    return /preview.*\.lovable\.app$/.test(origin) || (origin.includes('lovable.app') && origin.includes('preview'));
  };

  // Check if origin is a Lovable production domain
  const isLovableProduction = (origin: string) => {
    return origin.includes('lovable.app') && !origin.includes('preview');
  };

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    console.log('[CORS] Request origin:', origin);
    
    if (origin && (allowedOrigins.includes(origin) || isLovablePreview(origin) || isLovableProduction(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
      console.log('[CORS] Allowed origin:', origin);
    } else {
      console.log('[CORS] Origin not allowed:', origin);
    }
    
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');
    
    if (req.method === 'OPTIONS') {
      console.log('[CORS] Handling OPTIONS preflight request');
      return res.sendStatus(204);
    }
    next();
  });

  // Custom CORS preflight handler for file upload
  app.options('/api/simple-upload', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');
    res.sendStatus(204);
  });

  // --- WALLET ENDPOINTS (HOTFIX) ---
  app.get('/api/wallet/balance', async (req: Request, res: Response) => {
    const user_id = req.query.user_id;
    console.log(`[WALLET] /api/wallet/balance called with user_id: ${user_id}`);
    if (!user_id) {
      console.error('[WALLET] Missing user_id parameter');
      return res.status(400).json({ error: 'Missing user_id' });
    }
    let wallet, error;
    try {
      let result = await supabase.from('wallets').select('*').eq('user_id', user_id).single();
      wallet = result.data;
      error = result.error;
    } catch (err) {
      console.error('[WALLET] Supabase query error:', err);
      return res.status(500).json({ error: 'Supabase query failed', details: err instanceof Error ? err.message : String(err) });
    }
    if (error && error.code === 'PGRST116') {
      // Create wallet row in 'wallets' table if not found
      try {
        let insertResult = await supabase.from('wallets').insert({ user_id, balance: 0 }).single();
        wallet = insertResult.data;
        error = insertResult.error;
        if (error) {
          console.error('[WALLET] Error creating wallet row:', error);
          return res.status(500).json({ error: error.message });
        }
      } catch (err) {
        console.error('[WALLET] Error creating wallet row:', err);
        return res.status(500).json({ error: 'Wallet row creation failed', details: err instanceof Error ? err.message : String(err) });
      }
    } else if (error) {
      console.error('[WALLET] Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }
    if (!wallet || typeof wallet.balance !== 'number') {
      console.error('[WALLET] Wallet row missing or balance column missing:', wallet);
      return res.status(500).json({ error: 'Wallet row missing or balance column missing' });
    }
    res.json({ balance: wallet.balance });
  });

  app.get('/api/wallet/transactions', async (req: Request, res: Response) => {
    const user_id = req.query.user_id;
    console.log(`[WALLET] /api/wallet/transactions called with user_id: ${user_id}`);
    if (!user_id) {
      console.error('[WALLET] Missing user_id parameter');
      return res.status(400).json({ error: 'Missing user_id' });
    }
    
    // Get transactions for the user (assuming you have a transactions table)
    const { data: transactions, error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('[WALLET] Supabase error fetching transactions:', error);
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ transactions: transactions || [] });
  });

  app.post('/api/wallet/add', async (req: Request, res: Response) => {
    const { user_id, amount } = req.body;
    if (!user_id || typeof amount !== 'number') {
      console.error('[WALLET] Missing user_id or amount');
      return res.status(400).json({ error: 'Missing user_id or amount' });
    }
    const { data: wallet, error } = await supabase.from('wallets').select('*').eq('user_id', user_id).single();
    if (error) return res.status(500).json({ error: error.message });
    const newBalance = (wallet?.balance || 0) + amount;
    const { error: updateError } = await supabase.from('wallets').update({ balance: newBalance }).eq('user_id', user_id);
    if (updateError) return res.status(500).json({ error: updateError.message });
    res.json({ balance: newBalance });
  });
  app.post('/api/wallet/admin/set-balance', async (req: Request, res: Response) => {
    const { user_id, balance } = req.body;
    if (!user_id || typeof balance !== 'number') {
      console.error('[WALLET] Missing user_id or balance');
      return res.status(400).json({ error: 'Missing user_id or balance' });
    }
    const { error } = await supabase.from('wallets').update({ balance }).eq('user_id', user_id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ balance });
  });

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('[REDIS][App] REDIS_URL is not set!');
  }
  console.log('[REDIS][App] Connecting to:', redisUrl);
  const testRedis = new IORedis(redisUrl);
  testRedis.on('connect', () => console.log('[REDIS][App] Connected!'));
  testRedis.on('error', (err) => console.error('[REDIS][App] Connection error:', err));

  // Log all requests for debugging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    next();
  });

  // Body parsers already set up above

  // Supabase JWT validation middleware
  const validateSupabaseToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET as string);
      (req as any).user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // Example protected endpoint
  app.get('/api/protected', validateSupabaseToken, (req, res) => {
    res.json({ message: 'You are authenticated!', user: (req as any).user });
  });

  // Add /api/auth/user endpoint for Lovable auth status check
  app.get('/api/auth/user', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    try {
      const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET as string);
      res.json({ user: decoded });
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Register simple routes FIRST (before main routes to avoid catch-all conflicts)
  console.log('[DEBUG] Registering simple routes...');
  const simpleRoutes = createSimpleRoutes();
  console.log('[DEBUG] createSimpleRoutes() called in index.ts');
  app.use('/api', simpleRoutes);
  console.log('[DEBUG] Simple routes registered');
  
  // Mount main API routes AFTER simple routes
  app.use('/api', routes);

  // Log all registered API routes
  const printRoutes = (stack: any[], prefix = '') => {
    stack.forEach((middleware: any) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(',').toUpperCase();
        console.log(`[ROUTE] ${methods} ${prefix}${middleware.route.path}`);
      } else if (middleware.name === 'router' && middleware.handle.stack) {
        printRoutes(middleware.handle.stack, prefix);
      }
    });
  };
  printRoutes(app._router.stack, '');

  // Enhanced health check endpoint that lists all registered routes and logs status
  app.get('/api/health', (req, res) => {
    const routes: { method: string; path: string }[] = [];
    (app._router.stack as any[]).forEach((middleware: any) => {
      if (middleware.route) {
        routes.push({
          method: Object.keys(middleware.route.methods)[0].toUpperCase(),
          path: middleware.route.path
        });
      } else if (middleware.name === 'router') {
        (middleware.handle.stack as any[]).forEach((handler: any) => {
          if (handler.route) {
            routes.push({
              method: Object.keys(handler.route.methods)[0].toUpperCase(),
              path: handler.route.path
            });
          }
        });
      }
    });
    console.log('[HEALTH] Health check hit. Registered routes:', routes);
    res.json({
      status: 'ok',
      message: 'Jadoo backend is running',
      timestamp: new Date().toISOString(),
      routes
    });
  });

  // Basic health endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Download endpoint
  app.get('/api/download/:file', (req, res) => {
    const { file } = req.params;
    const filePath = path.join(__dirname, '..', 'outputs', file);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ message: 'File not found' });
    }
  });

  // Job status endpoint
  app.get('/api/jobs/:feedId/status', async (req, res) => {
    try {
      const { feedId } = req.params;
      const job = await feedQueue.getJob(feedId);
      
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      
      const state = await job.getState();
      const progress = job.progress;
      const returnvalue = job.returnvalue;
      
      res.json({
        jobId: job.id,
        feedId,
        status: state,
        progress,
        createdAt: job.timestamp,
        finishedAt: job.finishedOn,
        returnvalue
      });
    } catch (error) {
      console.error('Error getting job status:', error);
      res.status(500).json({ message: 'Error getting job status' });
    }
  });

  // Patch the error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api/')) {
      const origin = req.headers.origin;
      if (origin && (allowedOrigins.includes(origin) || isLovablePreview(origin) || isLovableProduction(origin))) {
        res.header('Access-Control-Allow-Origin', origin);
      }
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');
      console.error('[API ERROR]', err, 'URL:', req.originalUrl, 'Headers:', req.headers, 'Body:', req.body);
      res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
    } else {
      res.status(500).send('<h1>Internal Server Error</h1>');
    }
  });

  // Patch the 404 handler
  app.all('/api/*', (req, res) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || isLovablePreview(origin))) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, ngrok-skip-browser-warning');
    console.error('[API 404] Not found:', req.originalUrl, 'Headers:', req.headers, 'Body:', req.body);
    res.status(404).json({ message: 'API endpoint not found', path: req.originalUrl });
  });

  // Catch-all for frontend routes (SPA fallback)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });

  app.listen(Number(port), '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
})();
