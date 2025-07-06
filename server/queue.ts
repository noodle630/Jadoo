import * as fs from 'fs';
import * as path from 'path';

// Directory creation and logging at the absolute top
const tempUploadsDir = 'temp_uploads';
if (!fs.existsSync(tempUploadsDir)) {
  fs.mkdirSync(tempUploadsDir, { recursive: true });
  console.log('[WORKER_DIR_CREATE] Created temp_uploads directory');
} else {
  console.log('[WORKER_DIR_CREATE] temp_uploads directory already exists');
}

const outputsDir = 'outputs';
if (!fs.existsSync(outputsDir)) {
  fs.mkdirSync(outputsDir, { recursive: true });
  console.log('[WORKER_DIR_CREATE] Created outputs directory');
} else {
  console.log('[WORKER_DIR_CREATE] outputs directory already exists');
}

// Log critical env vars at startup
console.log('[WORKER_STARTUP] ENV', {
  REDIS_URL: process.env.REDIS_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***set***' : '***missing***',
  NODE_ENV: process.env.NODE_ENV
});

import 'dotenv/config';
// BullMQ queue and worker setup for LLM enrichment
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { traceLLMCall, traceFileOperation, traceDatabaseOperation, traceSupabaseOperation } from './telemetry.js';
import { logJobProgress, logPerformance, logError, logLLMCall } from './logger.js';
// @ts-ignore
import analyticsService from './utils/analytics.js';

console.log('[DEBUG] REDIS_URL at queue.js:', process.env.REDIS_URL);

// Redis connection (default to localhost for dev)
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
});

// Create the queue
const feedQueue = new Queue('feed-transform', { connection });

// Worker process for feed transformation with increased concurrency
const feedWorker = new Worker('feed-transform', async job => {
  const startTime = Date.now();
  const { feedId, fileBuffer, fields, fileName, platform, email, category } = job.data;
  
  logJobProgress(feedId, 0, 'started', `Starting job ${job.id} for feed ${feedId}`);
  console.log(`[Worker] Starting job ${job.id} for feed ${feedId}`);
  console.log(`[Worker] Platform: ${platform}, Rows: ~${fileBuffer.toString().split('\n').length - 1}`);
  
  try {
    // Update job status to processing
    await job.updateProgress(10);
    
    // Write file buffer to temp location for transformer
    const tempInputPath = `temp_uploads/${feedId}.csv`;
    const fileTrace = traceFileOperation('write', tempInputPath, { size: fileBuffer.length });
    // Ensure fileBuffer is a Buffer (handle { type: 'Buffer', data: [...] } case)
    const bufferToWrite = Buffer.isBuffer(fileBuffer)
      ? fileBuffer
      : Buffer.from(fileBuffer.data || fileBuffer, 'utf-8');
    console.log(`[Worker] Writing file buffer to ${tempInputPath}...`);
    fs.writeFileSync(tempInputPath, bufferToWrite);
    fileTrace.end();
    console.log(`[Worker] Wrote temp file: ${tempInputPath}`);
    
    await job.updateProgress(20);
    
    // Import and call transformer logic
    let handleProcess;
    if (process.env.NODE_ENV === 'development') {
      // Use .ts extension in dev (tsx)
      ({ handleProcess } = await import('./utils/transformer.ts'));
    } else {
      // Use .js extension in prod
      ({ handleProcess } = await import('./utils/transformer.js'));
    }
    
    // Create fake req/res objects for transformer
    const fakeReq = { params: { id: feedId } };
    const fakeRes = {
      json: (data) => {
        console.log(`[Worker] Transformer completed successfully`);
        return data;
      },
      status: (code) => ({ json: (data) => { throw new Error(`Transformer failed: ${JSON.stringify(data)}`); } })
    };
    
    await job.updateProgress(30);
    
    // Call transformer (this is where the LLM magic happens)
    console.log(`[Worker] Calling transformer for ${feedId}...`);
    const transformStartTime = Date.now();
    const transformResult = await handleProcess(fakeReq, fakeRes);
    const transformTime = Date.now() - transformStartTime;
    logPerformance('transformer_process', transformTime, { feedId, rows: fileBuffer.toString().split('\n').length - 1 });
    console.log(`[Worker] Transformer completed in ${transformTime}ms`);
    
    await job.updateProgress(70);
    
    // Upload result to Supabase
    console.log(`[Worker] Preparing to upload XLSX to Supabase Storage: feeds/${feedId}.xlsx`);
    const outputXlsxPath = `outputs/${feedId}_output.xlsx`;
    
    if (!fs.existsSync(outputXlsxPath)) {
      console.error(`[Worker] Expected XLSX output not found: ${outputXlsxPath}`);
      throw new Error(`Expected XLSX output not found: ${outputXlsxPath}`);
    }
    
    const xlsxBuffer = fs.readFileSync(outputXlsxPath);
    const uploadTrace = traceSupabaseOperation('upload', 'feeds', { fileSize: xlsxBuffer.length });
    console.log(`[Worker] Uploading XLSX to Supabase Storage: feeds/${feedId}.xlsx`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('feeds')
      .upload(`${feedId}.xlsx`, xlsxBuffer, { 
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        upsert: true 
      });
    console.log(`[Worker] Supabase upload response:`, { uploadData, uploadError });
    if (uploadError) {
      console.error(`[Worker] Supabase upload failed:`, uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: publicData } = supabase.storage.from('feeds').getPublicUrl(`${feedId}.xlsx`);
    const publicUrl = publicData.publicUrl;
    console.log(`[Worker] Supabase public URL: ${publicUrl}`);
    
    await job.updateProgress(90);
    
    // Save to database
    const dbTrace = traceDatabaseOperation('upsert', 'feeds', { feedId });
    console.log(`[Worker] Upserting feed record in Supabase for feedId: ${feedId}`);
    const { data: upsertData, error: dbError } = await supabase.from('feeds').upsert({
      id: feedId,
      filename: fileName || `${feedId}.xlsx`,
      platform: platform,
      status: 'completed',
      upload_time: new Date().toISOString(),
      output_path: publicUrl,
      summary_json: transformResult.summary_json || {},
      email: email || null,
      category: category || null
    });
    console.log(`[Worker] Supabase upsert response:`, { upsertData, dbError });
    dbTrace.end(dbError);
    if (dbError) {
      console.error(`[Worker] Database save failed:`, dbError);
      throw new Error(`Database save failed: ${dbError.message}`);
    }
    
    await job.updateProgress(100);
    
    const processingTime = Date.now() - startTime;
    logJobProgress(feedId, 100, 'completed', `Job completed in ${processingTime}ms`);
    logPerformance('job_total', processingTime, { feedId, transformTime });
    console.log(`[Worker] Job ${job.id} completed successfully in ${processingTime}ms`);
    console.log(`[Worker] Breakdown: Transform=${transformTime}ms, Total=${processingTime}ms`);
    
    // Record analytics
    try {
      const summary = transformResult.summary_json || {};
      console.log(`[Worker] Recording analytics for ${feedId}`);
      await analyticsService.recordJobAnalytics({
        feedId,
        jobId: job.id,
        platform,
        category,
        totalRows: fileBuffer.toString().split('\n').length - 1,
        processingTime,
        transformTime,
        llmCalls: summary.llm_calls || 0,
        llmErrors: summary.llm_errors || 0,
        cacheHits: summary.cache_hits || 0,
        successRate: summary.success_rate || 0,
        avgConfidence: summary.avg_confidence || 0,
        blankFieldsCount: summary.blanks?.length || 0,
        warnings: summary.warnings || [],
        suggestions: summary.suggestions || []
      });
      
      // Record field analytics if available
      if (summary.field_stats) {
        console.log(`[Worker] Recording field analytics for ${feedId}`);
        await analyticsService.recordFieldAnalytics(feedId, summary.field_stats);
      }
      
      console.log(`[Worker] Analytics recorded for ${feedId}`);
    } catch (analyticsError) {
      console.error(`[Worker] Failed to record analytics for ${feedId}:`, analyticsError);
    }
    
    return { 
      status: 'completed', 
      jobId: job.id,
      feedId,
      processingTime,
      transformTime,
      outputUrl: publicUrl,
      summary: transformResult.summary_json
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logError(error, { feedId, jobId: job.id, processingTime });
    console.error(`[Worker] Job ${job.id} failed after ${processingTime}ms:`, error);
    if (error instanceof Error && error.stack) {
      console.error(`[Worker] Stack trace:`, error.stack);
    }
    // Save error to database
    try {
      const REMOVED_SECRET= (await import('../supabaseClient.js')).default;
      const dbTrace = traceDatabaseOperation('upsert', 'feeds', { feedId, status: 'failed' });
      console.log(`[Worker] Upserting failed job to DB for feedId: ${feedId}`);
      await supabase.from('feeds').upsert({
        id: feedId,
        filename: fileName || `${feedId}.xlsx`,
        platform: platform,
        status: 'failed',
        upload_time: new Date().toISOString(),
        summary_json: { error: error.message, processingTime },
        email: email || null,
        category: category || null
      });
      dbTrace.end();
    } catch (dbError) {
      console.error(`[Worker] Failed to save error to database:`, dbError);
    }
    
    throw error;
  }
}, { 
  connection,
  concurrency: 4 // Process 4 jobs simultaneously for better throughput
});

feedWorker.on('active', (job) => {
  console.log(`[Worker] Job ${job.id} is now active (feedId: ${job.data.feedId})`);
});

feedWorker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed:`, result);
});

feedWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err);
});

// Export queue for use in API routes
export { feedQueue };

console.log('[WORKER_READY] Worker startup complete, ready to process jobs.'); 