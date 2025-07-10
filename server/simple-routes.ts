import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { fromZodError } from 'zod-validation-error';
import { storage } from './storage';
import { z } from 'zod';
import reliableParser from './utils/reliableParser';
import { handleProcess } from './utils/transformer 2.js';
import { fileURLToPath } from 'url';
import { feedQueue } from '../server/queue.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure paths for ES modules

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '..', 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Use a placeholder that will be replaced with the actual feed ID
    // The actual feed ID will be generated in the upload process
    const timestamp = Date.now();
    cb(null, `upload_${timestamp}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

export function createSimpleRoutes() {
  console.log('[DEBUG] createSimpleRoutes called in simple-routes.ts');
  const router = Router();
  
  // GET endpoint for simple-upload (show upload form)
  router.get('/simple-upload', (req: Request, res: Response) => {
    console.log('[DEBUG] GET /simple-upload endpoint hit');
    res.json({ 
      message: 'Upload endpoint available',
      method: 'POST',
      description: 'Send multipart form data with file, platform, and email'
    });
  });
  
  // Create a new feed with reliable row counting
  router.post('/simple-upload', (req: Request, res: Response, next) => {
    console.log('[DEBUG] Entered POST /api/simple-upload handler');
    next();
  }, upload.single('file'), async (req: Request, res: Response) => {
    console.log('[DEBUG] After multer in POST /api/simple-upload');
    console.log('[UPLOAD] Request headers:', req.headers);
    console.log('[UPLOAD] Request body:', req.body);
    try {
      if (!req.file) {
        console.log('[UPLOAD] No file detected in upload request');
        res.status(400).json({ message: 'No file uploaded' });
        console.log('[UPLOAD] Response sent: 400 No file uploaded');
        return;
      }
      // Only allow Walmart marketplace (accept both 'marketplace' and 'platform' fields)
      const marketplace = (req.body.marketplace || req.body.platform || '').toLowerCase();
      if (marketplace !== 'walmart') {
        console.log(`[UPLOAD] Invalid marketplace: ${marketplace}`);
        res.status(400).json({ message: 'Only Walmart marketplace is supported at this time.' });
        return;
      }
      // Generate a feedId
      const feedId = `feed_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      // Save the uploaded file as temp_uploads/{feedId}.csv
      const tempInputPath = path.join(uploadDir, `${feedId}.csv`);
      fs.writeFileSync(tempInputPath, fs.readFileSync(req.file.path));
      const fileStats = fs.statSync(tempInputPath);
      console.log(`[UPLOAD] File saved as: ${tempInputPath}, size: ${fileStats.size} bytes`);
      // Enqueue BullMQ job for async processing
      const fileBuffer = fs.readFileSync(tempInputPath);
      console.log(`[ENQUEUE][SIMPLE-ROUTES] Enqueuing job for feedId: ${feedId} with data:`, {
        feedId,
        fileBufferLength: fileBuffer.length,
        fields: req.body,
        fileName: req.file.originalname,
        platform: req.body.platform,
        email: req.body.email,
        category: req.body.category,
        tier: req.body.tier || 'free'
      });
      const job = await feedQueue.add('feed-transform', {
        feedId,
        fileBuffer,
        fields: req.body,
        fileName: req.file.originalname,
        platform: req.body.platform,
        email: req.body.email,
        category: req.body.category,
        tier: req.body.tier || 'free'
      });
      console.log(`[ENQUEUE][SIMPLE-ROUTES] Job enqueued for feedId: ${feedId}, jobId: ${job.id}`);
      res.json({
        feedId,
        status: 'queued',
        message: 'File uploaded and job enqueued'
      });
      console.log(`[UPLOAD] JSON response sent for feedId: ${feedId}, job enqueued`);
    } catch (error) {
      console.error('[UPLOAD] Error creating feed:', error);
      res.status(500).json({ 
        message: 'Error creating feed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.log('[UPLOAD] Response sent: 500 Error creating feed');
    }
  });
  
  // Download endpoint for processed feeds
  router.get('/simple-download/:feedId', async (req: Request, res: Response) => {
    console.log(`[DEBUG] /api/simple-download/:feedId handler reached for feedId: ${req.params.feedId}`);
    const { feedId } = req.params;
    const isProd = process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME;
    
    try {
      if (isProd) {
        // In production, redirect to Supabase public URL
        console.log(`[DOWNLOAD][PROD] Fetching Supabase data for feedId: ${feedId}`);
        const supabase = (await import('../supabaseClient.js')).default;
        const { data, error } = await supabase.from('feeds').select('*').eq('id', feedId).single();
        
        console.log(`[DOWNLOAD][PROD] Supabase response for ${feedId}:`, { data, error });
        
        if (error) {
          console.log(`[DOWNLOAD][PROD] Supabase error for feedId: ${feedId}:`, error);
          return res.status(404).json({ message: 'Feed not found in database' });
        }
        
        if (!data) {
          console.log(`[DOWNLOAD][PROD] No data found for feedId: ${feedId}`);
          return res.status(404).json({ message: 'Feed not found' });
        }
        
        if (!data.output_path) {
          console.log(`[DOWNLOAD][PROD] No output_path for feedId: ${feedId}`);
          return res.status(404).json({ message: 'Output file not found' });
        }
        
        console.log(`[DOWNLOAD][PROD] Redirecting to: ${data.output_path}`);
        // Set Content-Disposition for nice filename
        const filename = `${data.platform || 'feed'}_${feedId}.xlsx`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.redirect(data.output_path);
      } else {
        // In dev, serve from local disk
        const filePath = path.join('outputs', `${feedId}_output.xlsx`);
        console.log(`[DOWNLOAD][DEV] Attempting to download: ${filePath}`);
        
        if (!fs.existsSync(filePath)) {
          console.log(`[DOWNLOAD][DEV] File not found for feedId: ${feedId}, path: ${filePath}`);
          
          // Check if the file exists in the database and has a different path
          try {
            const supabase = (await import('../supabaseClient.js')).default;
            const { data, error } = await supabase.from('feeds').select('*').eq('id', feedId).single();
            
            if (!error && data && data.output_path) {
              console.log(`[DOWNLOAD][DEV] Found Supabase URL for ${feedId}: ${data.output_path}`);
              const filename = `${data.platform || 'feed'}_${feedId}.xlsx`;
              res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
              return res.redirect(data.output_path);
            }
          } catch (dbError) {
            console.log(`[DOWNLOAD][DEV] Could not check database for ${feedId}:`, dbError);
          }
          
          return res.status(404).json({ message: 'File not found' });
        }
        
        res.setHeader('Content-Disposition', `attachment; filename="${feedId}_output.xlsx"`);
        res.download(filePath, (err) => {
          if (err) {
            console.log(`[DOWNLOAD][DEV] Error serving file for feedId: ${feedId}, error:`, err);
          } else {
            console.log(`[DOWNLOAD][DEV] File served for feedId: ${feedId}, path: ${filePath}`);
          }
        });
      }
    } catch (err) {
      console.error(`[DOWNLOAD] Error in download handler for feedId: ${feedId}`, err);
      return res.status(500).json({ message: 'Error fetching file from storage' });
    }
  });
  
  return router;
}