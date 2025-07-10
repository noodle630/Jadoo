import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { handleProcess } from './utils/transformer 2.js';
import Papa from 'papaparse';
import { dirname } from 'path';
import type { Request, Response, NextFunction, Router } from 'express';
import multer from 'multer';
// @ts-ignore
import { feedQueue } from './queue.js';
import supabase from "../supabaseClient.js";
// @ts-ignore
import analyticsService from './utils/analytics.js';
import Stripe from 'stripe';

const router: Router = express.Router();

// Patch for __dirname in ES modules
console.log('[DEBUG] __dirname:', __dirname);
console.log('[DEBUG] .env file should be at:', path.join(process.cwd(), '.env'));

// Configure multer for memory storage (no temp files)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File received:', file.originalname, file.mimetype);
    // Accept CSV files and common spreadsheet formats
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.originalname.toLowerCase().endsWith('.csv') ||
        file.originalname.toLowerCase().endsWith('.xlsx')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Top-level logging middleware
router.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl} | query:`, req.query, '| body:', req.body);
  next();
});

// Test endpoint for Lovable connection
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Jadoo backend is running", 
    timestamp: new Date().toISOString(),
    endpoints: {
      // simpleUpload: "POST /api/simple-upload", // REMOVED - now handled by simple-routes.ts 
      process: "POST /api/process/:id",
      logs: "GET /api/logs/:id",
      download: "GET /api/download/:file"
    }
  });
});

// GET /feeds - List all feeds (for history, dashboard, etc.)
router.get('/feeds', async (req, res) => {
  try {
    const { data, error } = await supabase.from('feeds').select('*').order('id', { ascending: false });
    if (error) {
      return res.status(500).json({ error: 'Failed to fetch feeds', details: error.message });
    }
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch feeds', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/transform/csv - Alias for /api/simple-upload (backward compatibility)
router.post('/transform/csv', upload.single('file'), async (req, res) => {
  console.log('=== TRANSFORM CSV ALIAS START ===');
  console.log('📄 File:', req.file ? req.file.originalname : 'NO FILE');
  console.log('📝 Fields:', req.body);

  try {
    if (!req.file) {
      console.error('[transform/csv] No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract fields from form data
    const platform = req.body.platform || req.body.marketplace || 'walmart';
    const email = req.body.email || 'anonymous@example.com';
    const category = req.body.category;

    console.log('[transform/csv] Extracted data:', {
      platform,
      email,
      category,
      fileExists: !!req.file,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    const feedId = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    console.log('[transform/csv] Generated feedId:', feedId);

    // Enqueue BullMQ job for async processing
    console.log('[ENQUEUE][ROUTES] Adding job to BullMQ queue with data:', {
      feedId,
      fileBufferLength: req.file.buffer.length,
      fields: { ...req.body, platform, email, category },
      fileName: req.file.originalname,
      platform,
      email,
      category
    });
    const job = await feedQueue.add('feed-transform', {
      feedId,
      fileBuffer: req.file.buffer,
      fields: { ...req.body, platform, email, category },
      fileName: req.file.originalname,
      platform,
      email,
      category
    });
    console.log('[ENQUEUE][ROUTES] Job added to queue for feedId:', feedId, 'jobId:', job.id);

    // Return immediate response
    res.json({
      feed_id: feedId,
      status: 'queued',
      message: 'File uploaded and job enqueued',
      file_info: {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      },
      platform: platform,
      category: category || 'auto-detect'
    });
    console.log('[transform/csv] Response sent for feedId:', feedId);
  } catch (error) {
    console.error('[transform/csv] Upload error:', error);
    if (error instanceof Error && error.stack) {
      console.error('[transform/csv] Stack trace:', error.stack);
    }
    res.status(500).json({ error: 'Upload failed', details: error instanceof Error ? error.message : String(error) });
  }
});

// ✅ /api/process/:id
router.post("/process/:id", handleProcess);

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Progress tracking storage
const processingJobs = new Map();

// Progress update endpoint
router.get('/feeds/:feedId/progress', async (req, res) => {
  const { feedId } = req.params;
  const userId = req.query.user_id;
  let job = processingJobs.get(feedId);

  if (!job) {
    // Try BullMQ
    try {
      const jobs = await feedQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
      const bullJob = jobs.find((j: any) => j.data.feedId === feedId);
      if (bullJob) {
        job = {
          feed_id: feedId,
          status: bullJob.finishedOn ? 'completed' : bullJob.failedReason ? 'failed' : 'processing',
          progress: bullJob.progress || 0,
          message: bullJob.finishedOn ? 'Completed' : bullJob.failedReason ? 'Failed' : 'Processing',
          timestamp: new Date(bullJob.timestamp).toISOString(),
          failedReason: bullJob.failedReason,
          returnvalue: bullJob.returnvalue,
        };
      }
    } catch (err) {
      console.error('Error checking BullMQ for progress:', err);
    }
  }

  // If job is completed, try to get detailed stats from database
  let summary: any = {};
  if (job && job.status === 'completed') {
    try {
      const { data: feedData, error } = await supabase
        .from('feeds')
        .select('*')
        .eq('id', feedId)
        .single();
      
      if (!error && feedData) {
        summary = feedData.summary_json || {};
        // Enhance job data with detailed transformer stats using standardized fields
        job = {
          ...job,
          // Basic stats - read from standardized field names
          totalRows: summary.total_rows || summary.rowCount || 0,
          processedRows: summary.processed_rows || summary.rowCount || 0,
          AIEnhanced: summary.total_enriched || summary.stats?.totalEnriched || 0,
          category: feedData.category || summary.category || 'unknown',
          tier: summary.tier || 'free',
          // Additional stats from transformer using standardized fields
          totalMapped: summary.total_mapped || summary.stats?.totalMapped || 0,
          totalLLMCalls: summary.total_llm_calls || summary.stats?.totalLLMCalls || 0,
          totalErrors: summary.total_errors || summary.stats?.totalErrors || 0,
          cacheHits: summary.cache_hits || summary.stats?.cacheHits || 0,
          // File info
          fileName: feedData.filename,
          outputUrl: feedData.output_path,
          downloadUrl: `/api/simple-download/${feedId}?user_id=${userId || ''}`,
          // Timestamps
          createdAt: feedData.upload_time,
          completedAt: feedData.upload_time
        };
      }
    } catch (dbError) {
      console.warn(`Could not fetch detailed stats for ${feedId}:`, dbError);
    }
  }

  // ROBUST FALLBACK: Always try to get stats from database, even if job is not completed
  if (!summary || Object.keys(summary).length === 0) {
    try {
      const { data: feedData, error } = await supabase
        .from('feeds')
        .select('*')
        .eq('id', feedId)
        .single();
      
      if (!error && feedData && feedData.summary_json) {
        summary = feedData.summary_json;
        console.log(`📊 Found summary in DB for ${feedId}:`, summary);
      }
    } catch (dbError) {
      console.warn(`Could not fetch summary from DB for ${feedId}:`, dbError);
    }
  }

  // Apply stats from summary to job object with robust fallbacks
  if (summary && Object.keys(summary).length > 0) {
    job = {
      ...job,
      // Always use standardized field names with fallbacks
      totalRows: summary.total_rows || summary.rowCount || summary.total_products || 0,
      processedRows: summary.processed_rows || summary.rowCount || summary.total_products || 0,
      AIEnhanced: summary.total_enriched || summary.stats?.totalEnriched || summary.llm_calls || 0,
      totalMapped: summary.total_mapped || summary.stats?.totalMapped || 0,
      totalLLMCalls: summary.total_llm_calls || summary.stats?.totalLLMCalls || summary.llm_calls || 0,
      totalErrors: summary.total_errors || summary.stats?.totalErrors || summary.llm_errors || 0,
      cacheHits: summary.cache_hits || summary.stats?.cacheHits || 0,
      category: summary.category || 'unknown',
      tier: summary.tier || 'free',
      failedReason: summary.failedReason || summary.error || undefined
    };
  }

  // If failedReason is present, always set status to 'failed' and message to 'Failed'
  if (job && job.failedReason) {
    job.status = 'failed';
    job.message = 'Failed';
  }
  // Ensure job object exists before accessing properties
  if (!job) {
    job = {
      status: 'not_found',
      progress: 0,
      message: 'Job not found',
      totalRows: 0,
      processedRows: 0,
      AIEnhanced: 0,
      totalMapped: 0,
      totalLLMCalls: 0,
      totalErrors: 0,
      cacheHits: 0
    };
  }

  // Final fallback: ensure all required fields exist
  if (!job.totalRows) job.totalRows = 0;
  if (!job.processedRows) job.processedRows = 0;
  if (!job.AIEnhanced) job.AIEnhanced = 0;
  if (!job.totalMapped) job.totalMapped = 0;
  if (!job.totalLLMCalls) job.totalLLMCalls = 0;
  if (!job.totalErrors) job.totalErrors = 0;
  if (!job.cacheHits) job.cacheHits = 0;

  console.log(`📊 Progress check for ${feedId}:`, job);
  res.json(job);
});

// Background processing with progress updates
async function processFileInBackground(feedId: string, fileBuffer: Buffer, fields: any) {
  const updateProgress = (progress: number, message: string, data: any = {}) => {
    const jobData = {
      feed_id: feedId,
      status: progress < 100 ? 'processing' : 'completed',
      progress,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };
    processingJobs.set(feedId, jobData);
    console.log(`📈 Progress Update [${feedId}]: ${progress}% - ${message}`);
  };

  let supabaseFilePath = '';
  let publicUrl = '';
  let summary = {};
  try {
    updateProgress(10, 'Starting file analysis...');
    // Convert buffer to string for CSV processing
    const csvContent = fileBuffer.toString('utf-8');
    updateProgress(25, 'Parsing CSV structure...');
    // --- Use transformer logic to get mapped product feed ---
    // Write the buffer to a temp file with the feed ID as filename
    const tempInputPath = `temp_uploads/${feedId}.csv`;
    fs.writeFileSync(tempInputPath, csvContent, 'utf-8');
    updateProgress(40, 'Running product transformer...');
    // Simulate Express req/res for handleProcess
    const fakeReq = { params: { id: feedId } };
    let transformResult: any;
    try {
      // Use the transformer logic to get the mapped product feed
      transformResult = await new Promise((resolve, reject) => {
        // Fake res object to capture result
        const fakeRes = {
          json: (data: any) => resolve(data),
          status: (code: number) => ({ json: (data: any) => reject(data) })
        };
        // @ts-ignore
        handleProcess(fakeReq, fakeRes);
      });
    } catch (err: any) {
      throw new Error('Transformer failed: ' + (err && (err as any).error ? (err as any).error : err));
    }
    updateProgress(70, 'Uploading optimized XLSX to Supabase...');
    // Upload the XLSX output file to Supabase Storage with consistent naming
    const outputXlsxPath = `outputs/${feedId}_output.xlsx`;
    if (!fs.existsSync(outputXlsxPath)) throw new Error('Expected XLSX output not found: ' + outputXlsxPath);
    const xlsxBuffer = fs.readFileSync(outputXlsxPath);
    supabaseFilePath = `feeds/${feedId}.xlsx`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from('feeds').upload(`${feedId}.xlsx`, xlsxBuffer, { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', upsert: true });
    if (uploadError) throw new Error('Supabase upload failed: ' + uploadError.message);
    // Get public URL
    const { data: publicData } = supabase.storage.from('feeds').getPublicUrl(`${feedId}.xlsx`);
    publicUrl = publicData.publicUrl;
    // Insert/update row in feeds table
    summary = {
      total_rows: transformResult && transformResult.rows ? transformResult.rows.length : null,
      processed_rows: transformResult && transformResult.rows ? transformResult.rows.length : null,
      avg_confidence: null, // You can compute this if you have confidence data
      categories_detected: transformResult.category ? [transformResult.category] : [],
      download_url: publicUrl
    };
    const { error: dbError } = await supabase.from('feeds').upsert({
      id: feedId,
      filename: fields.fileName || fields.filename || `${feedId}.xlsx`,
      platform: fields.platform,
      status: 'completed',
      upload_time: new Date().toISOString(),
      output_path: publicUrl,
      summary_json: summary,
      email: fields.email || null,
      category: fields.category || null
    });
    if (dbError) throw new Error('Supabase DB upsert failed: ' + dbError.message);
    // Final completion
    updateProgress(100, 'Feed optimization completed!', {
      summary,
      rows_processed: transformResult && transformResult.rows ? transformResult.rows : []
    });
  } catch (error) {
    console.error('🚨 Background processing error:', error);
    updateProgress(0, 'Processing failed', { error: (error as Error).message });
    // Log error to Supabase
    await supabase.from('feeds').upsert({
      id: feedId,
      filename: fields.fileName || fields.filename || `${feedId}.xlsx`,
      platform: fields.platform,
      status: 'failed',
      upload_time: new Date().toISOString(),
      output_path: publicUrl,
      summary_json: { error: error instanceof Error ? error.message : String(error) },
      email: fields.email || null,
      category: fields.category || null
    });
  }
}

// REMOVED: Duplicate simple-upload route - now handled by simple-routes.ts

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const TIER_CONFIG = {
  free: {
    maxRows: 10,
    priceId: null, // No payment for free tier
  },
  basic: {
    maxRows: 1000,
    priceId: process.env.STRIPE_PRICE_ID_BASIC,
  },
  premium: {
    maxRows: 10000,
    priceId: process.env.STRIPE_PRICE_ID_PREMIUM,
  },
};

router.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    console.log('[STRIPE] Creating checkout session with data:', req.body);
    
    const { email, plan, rowCount } = req.body as { email: string; plan: keyof typeof TIER_CONFIG; rowCount: number };
    
    if (!plan || !(plan in TIER_CONFIG)) {
      console.log('[STRIPE] Invalid plan:', plan);
      return res.status(400).json({ error: 'Invalid plan selected' });
    }
    
    const tier = TIER_CONFIG[plan];
    console.log('[STRIPE] Tier config:', tier);
    
    if (plan === 'free') {
      if (rowCount > tier.maxRows) {
        return res.status(400).json({ error: 'Free tier only supports up to 10 rows' });
      }
      return res.json({ url: null, free: true });
    }
    
    if (!tier.priceId) {
      console.error('[STRIPE] No price ID configured for tier:', plan);
      return res.status(500).json({ error: 'No Stripe price ID configured for this tier' });
    }
    
    console.log('[STRIPE] Creating session with price ID:', tier.priceId);
    console.log('[STRIPE] Success URL:', process.env.STRIPE_SUCCESS_URL);
    console.log('[STRIPE] Cancel URL:', process.env.STRIPE_CANCEL_URL);
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price: tier.priceId,
          quantity: 1,
        },
      ],
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL,
    });
    
    console.log('[STRIPE] Session created successfully:', session.id);
    res.json({ url: session.url });
  } catch (err) {
    console.error('[STRIPE] Checkout session error:', err);
    if (err instanceof Error) {
      console.error('[STRIPE] Error details:', err.message);
      console.error('[STRIPE] Error stack:', err.stack);
    }
    res.status(500).json({ error: 'Stripe session creation failed' });
  }
});

// Add below your POST routes
// Removed /api/logs/:id route - logs table doesn't exist in database

router.get("/download/:file", async (req, res) => {
  const file = req.params.file;
  const filePath = path.join("outputs", file);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }
  res.download(filePath);
});

// Dynamic categories endpoint
router.get('/platforms/:platform/categories', async (req, res) => {
  const { platform } = req.params;
  const dir = path.join(__dirname, '../attached_assets/templates', platform);
  try {
    if (!fs.existsSync(dir)) {
      return res.status(404).json({ error: 'Platform not found' });
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.xlsx'));
    const categories = files.map(f => {
      const base = f.replace('.xlsx', '');
      // Convert snake_case or underscores to user-friendly label
      return base
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    });
    return res.json({ platform, categories });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read categories', details: err instanceof Error ? err.message : String(err) });
  }
});

// Add a download endpoint that redirects to the Supabase public URL
router.get('/feeds/:feedId/download', async (req, res) => {
  const { feedId } = req.params;
  // Try to get the feed from Supabase
  const { data, error } = await supabase.from('feeds').select('*').eq('id', feedId).single();
  if (error || !data) {
    return res.status(404).json({ error: 'Feed not found' });
  }
  if (!data.output_path) {
    return res.status(404).json({ error: 'No output file for this feed' });
  }
  if (!data.output_path.endsWith('.xlsx')) {
    console.warn(`[Download] Attempted to download non-xlsx file for feed ${feedId}: ${data.output_path}`);
    return res.status(400).json({ error: 'Only .xlsx downloads are supported.' });
  }
  // Set Content-Disposition for nice filename (browser will use this if possible)
  const filename = `${data.platform || 'feed'}_${feedId}.xlsx`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  // Redirect to the public URL
  return res.redirect(data.output_path);
});

// Endpoint to check if feed is ready (DB row exists and public file is accessible)
router.get('/feeds/:feedId/ready', async (req, res) => {
  const { feedId } = req.params;
  // Try to get the feed from Supabase
  const { data, error } = await supabase.from('feeds').select('*').eq('id', feedId).single();
  if (error || !data || !data.output_path) {
    return res.json({ ready: false, url: null });
  }
  // Check if the public file URL is accessible (HEAD request)
  try {
    const fetch = (await import('node-fetch')).default;
    const headResp = await fetch(data.output_path, { method: 'HEAD' });
    if (headResp.ok) {
      return res.json({ ready: true, url: data.output_path });
    } else {
      return res.json({ ready: false, url: data.output_path });
    }
  } catch (err) {
    return res.json({ ready: false, url: data.output_path });
  }
});

// Job status endpoint for BullMQ jobs
router.get('/jobs/:feedId/status', async (req, res) => {
  const { feedId } = req.params;
  
  try {
    // Get all jobs for this feed
    const jobs = await feedQueue.getJobs(['active', 'waiting', 'completed', 'failed']);
    const job = jobs.find((j: any) => j.data.feedId === feedId);
    
    if (!job) {
      return res.status(404).json({ 
        status: 'not_found', 
        message: 'Job not found' 
      });
    }
    
    const jobData: any = {
      jobId: job.id,
      feedId: job.data.feedId,
      status: job.finishedOn ? 'completed' : job.failedReason ? 'failed' : 'processing',
      progress: job.progress || 0,
      createdAt: job.timestamp,
      finishedAt: job.finishedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      platform: job.data.platform,
      fileName: job.data.fileName
    };
    
    // If completed, also get the feed data from Supabase
    if (job.finishedOn && !job.failedReason) {
      try {
        const { data: feedData, error } = await supabase
          .from('feeds')
          .select('*')
          .eq('id', feedId)
          .single();
        
        if (!error && feedData) {
          jobData.feed = feedData;
        }
      } catch (dbError) {
        console.warn(`Could not fetch feed data for ${feedId}:`, dbError);
      }
    }
    
    res.json(jobData);
    
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch job status',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Global error handler
router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[GLOBAL ERROR]', err);
  res.status(500).json({ error: 'Internal server error', details: err instanceof Error ? err.message : String(err) });
});
// Catch-all 404 route
router.use((req: Request, res: Response) => {
  console.log('[404] Unmatched route:', req.method, req.originalUrl, '| query:', req.query, '| body:', req.body);
  res.status(404).json({ error: 'Not found' });
});

// NOTE for Lovable: The backend now only returns the XLSX output file (platform template, all columns, all LLM enrichment, all mapping preserved). No CSV is generated or returned. The transformer logic is fully preserved and used as before.

// Analytics endpoints
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const dashboardData = await analyticsService.getDashboardData();
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

router.get('/analytics/jobs', async (req, res) => {
  try {
    const { platform, category } = req.query;
    const jobSummary = await analyticsService.getJobPerformanceSummary(platform, category);
    res.json({
      success: true,
      data: jobSummary
    });
  } catch (error) {
    console.error('Error getting job analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get job analytics'
    });
  }
});

router.get('/analytics/fields', async (req, res) => {
  try {
    const fieldSummary = await analyticsService.getFieldPerformanceSummary();
    res.json({
      success: true,
      data: fieldSummary
    });
  } catch (error) {
    console.error('Error getting field analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get field analytics'
    });
  }
});

router.get('/analytics/llm', async (req, res) => {
  try {
    const llmSummary = await analyticsService.getLLMPerformanceSummary();
    res.json({
      success: true,
      data: llmSummary
    });
  } catch (error) {
    console.error('Error getting LLM analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get LLM analytics'
    });
  }
});

router.get('/analytics/recent', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const recentJobs = await analyticsService.getRecentJobAnalytics(parseInt(limit as string));
    res.json({
      success: true,
      data: recentJobs
    });
  } catch (error) {
    console.error('Error getting recent analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recent analytics'
    });
  }
});

// Simple download endpoint moved to simple-routes.ts to avoid conflicts

// --- PATCH WALLET ENDPOINTS ---
// Robust wallet balance endpoint (UUID only)
router.get('/wallet/balance', async (req, res) => {
  const user_id = req.query.user_id;
  console.log(`[WALLET] /wallet/balance called with user_id: ${user_id}`);
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
// Wallet: add funds (UUID only)
router.post('/wallet/add', async (req, res) => {
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
// Wallet: admin set balance (UUID only)
router.post('/wallet/admin/set-balance', async (req, res) => {
  const { user_id, balance } = req.body;
  if (!user_id || typeof balance !== 'number') {
    console.error('[WALLET] Missing user_id or balance');
    return res.status(400).json({ error: 'Missing user_id or balance' });
  }
  const { error } = await supabase.from('wallets').update({ balance }).eq('user_id', user_id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ balance });
});

export default router;

