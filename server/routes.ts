import dotenv from "dotenv";
dotenv.config(); // this MUST come before using any process.env vars

import express from "express";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { handleProcess } from "./utils/transformer"; // ✅ match your tree
import Papa from 'papaparse';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { feedQueue } from './queue.js';
import REMOVED_SECRETfrom '../supabaseClient';

const router = express.Router();

// Patch for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Test endpoint for Lovable connection
router.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Jadoo backend is running", 
    timestamp: new Date().toISOString(),
    endpoints: {
      upload: "POST /api/upload",
      simpleUpload: "POST /api/simple-upload", 
      process: "POST /api/process/:id",
      logs: "GET /api/logs/:id",
      download: "GET /api/download/:file"
    }
  });
});

// ✅ /api/upload — uses express-fileupload
router.post("/upload", async (req, res) => {
  try {
    if (!req.files || !(req.files as any).file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const file = (req.files as any).file;
    const id = uuidv4();
    const uploadPath = path.join("temp_uploads", `${id}.csv`);

    await file.mv(uploadPath);

    console.log(`✅ File saved: ${uploadPath}`);
    return res.json({ id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Upload error: ${message}`);
    return res.status(500).json({ error: message });
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
router.get('/feeds/:feedId/progress', (req, res) => {
  const { feedId } = req.params;
  const job = processingJobs.get(feedId) || { 
    status: 'not_found',
    progress: 0,
    message: 'Job not found'
  };
  
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
    // We'll call the core logic directly here for now
    // Write the buffer to a temp file so transformer can use it
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
    // Upload the XLSX output file to Supabase Storage
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

// NEW: Multer-based upload route
router.post('/simple-upload', upload.single('file'), async (req, res) => {
  console.log('=== MULTER UPLOAD START ===');
  console.log('📄 File:', req.file ? req.file.originalname : 'NO FILE');
  console.log('📝 Fields:', req.body);

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Extract fields from form data
    const platform = req.body.platform;
    const email = req.body.email;
    const category = req.body.category;

    console.log('📋 Extracted data:', {
      platform,
      email,
      category,
      fileExists: !!req.file,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    // Validation
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const feedId = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    console.log('✅ Upload successful:', {
      feedId,
      filename: req.file.originalname,
      size: req.file.size,
      platform: platform
    });

    // Enqueue BullMQ job for async processing
    await feedQueue.add('feed-transform', {
      feedId,
      fileBuffer: req.file.buffer,
      fields: req.body,
      fileName: req.file.originalname,
      platform,
      email,
      category
    });

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
  } catch (error) {
    console.error('💥 Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error instanceof Error ? error.message : String(error) });
  }
});

export default router;

// Add below your POST routes
router.get("/logs/:id", async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("logs").select("*").eq("feed_id", id).order("row_number");
  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
  return res.json(data);
});


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

// Global error handler (after all routes)
router.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('🚨 Global error handler:', error);
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }
  return res.status(500).json({ error: 'Internal server error' });
});

// NOTE for Lovable: The backend now only returns the XLSX output file (platform template, all columns, all LLM enrichment, all mapping preserved). No CSV is generated or returned. The transformer logic is fully preserved and used as before.

