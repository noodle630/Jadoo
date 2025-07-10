import * as fs from 'fs';
import * as path from 'path';

console.log('WORKER CODE VERSION: 2025-07-09T02:15:00+00:00');
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
// import { traceLLMCall, traceFileOperation, traceDatabaseOperation, traceSupabaseOperation } from './telemetry.js';
import { logJobProgress, logPerformance, logError, logLLMCall } from './logger.js';
// @ts-ignore
import analyticsService from './utils/analytics.js';

console.log('[DEBUG] REDIS_URL at queue.js:', process.env.REDIS_URL);

// Redis connection (default to localhost for dev)
const connection = new (IORedis as any)(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
});

// Create the queue
const feedQueue = new Queue('feed-transform', { connection });

// Add global error handlers for robustness
process.on('unhandledRejection', async (reason: any) => {
  console.error('[WORKER][FATAL] Unhandled Rejection:', reason);
  try {
    const jobs = await feedQueue.getJobs(['active']);
    for (const job of jobs) {
      await job.moveToFailed(new Error('Unhandled Rejection: ' + (reason?.message || reason)), true);
    }
  } catch (e) {
    console.error('[WORKER][FATAL] Failed to mark active jobs as failed after unhandledRejection:', e);
  }
  process.exit(1);
});

process.on('uncaughtException', async (err: any) => {
  console.error('[WORKER][FATAL] Uncaught Exception:', err);
  try {
    const jobs = await feedQueue.getJobs(['active']);
    for (const job of jobs) {
      await job.moveToFailed(new Error('Uncaught Exception: ' + (err?.message || err)), true);
    }
  } catch (e) {
    console.error('[WORKER][FATAL] Failed to mark active jobs as failed after uncaughtException:', e);
  }
  process.exit(1);
});

// Add a job timeout to auto-fail long-running jobs (e.g., 30 minutes)
const JOB_TIMEOUT_MS = 30 * 60 * 1000;

// Worker process for feed transformation with increased concurrency
const feedWorker = new Worker('feed-transform', async job => {
  const startTime = Date.now();
  const { feedId, fileBuffer, fields, fileName, platform, email, category } = job.data;
  let timeoutHandle: NodeJS.Timeout | null = null;
  let supabase: any;
  try {
    // Set up timeout
    timeoutHandle = setTimeout(async () => {
      console.error(`[Worker][TIMEOUT] Job ${job.id} feedId=${feedId} exceeded timeout of ${JOB_TIMEOUT_MS / 60000} minutes.`);
      try {
        await job.moveToFailed(new Error('Job timed out after 30 minutes'), true as any);
      } catch (e) {
        console.error('[Worker][TIMEOUT] Failed to mark job as failed after timeout:', e);
      }
    }, JOB_TIMEOUT_MS);

    // Dynamically import supabase client
    const supabase = (await import('../supabaseClient.js')).default;

    console.log(`[Worker] ====== JOB START feedId=${feedId} jobId=${job.id} ======`);
    try {
      logJobProgress(feedId, 0, 'uploading', `Uploading file for job ${job.id}`);
      await job.updateProgress(10);
      
      // Write file buffer to temp location for transformer
      const tempInputPath = `temp_uploads/${feedId}.csv`;
      // const fileTrace = traceFileOperation('write', tempInputPath, { size: fileBuffer.length });
      // Ensure fileBuffer is a Buffer (handle { type: 'Buffer', data: [...] } case)
      const bufferToWrite = Buffer.isBuffer(fileBuffer)
        ? fileBuffer
        : Buffer.from(fileBuffer.data || fileBuffer, 'utf-8');
      console.log(`[Worker] Writing file buffer to ${tempInputPath}`);
      fs.writeFileSync(tempInputPath, bufferToWrite);
      console.log(`[Worker] File written: ${tempInputPath}, size=${bufferToWrite.length}`);
      // fileTrace.end();
      
      logJobProgress(feedId, 10, 'ai_analysis', `Starting AI analysis for job ${job.id}`);
      await job.updateProgress(30);
      
      // Import and call transformer logic
      console.log(`[Worker] Importing transformer...`);
      // @ts-ignore
      let handleProcess;
      ({ handleProcess } = await import('./utils/transformer 2.js'));
      console.log(`[Worker] Calling transformer for feedId=${feedId}`);
      
      // Create fake req/res objects for transformer
      const fakeReq = { params: { id: feedId } };
      const fakeRes = {
        json: (data: any) => {
          console.log(`[Worker] Transformer completed successfully`);
          return data;
        },
        status: (code: any) => ({ json: (data: any) => { throw new Error(`Transformer failed: ${JSON.stringify(data)}`); } })
      };
      
      // Call transformer (this is where the LLM magic happens)
      console.log(`[Worker] Starting transformation for feedId: ${feedId}`);
      console.log(`[Worker] Tier: ${job.data.tier || 'free'}`);
      // Call the transformer with tier information
      const transformStartTime = Date.now();
      if (!handleProcess) {
        throw new Error('handleProcess is not defined. Make sure transformer 2 is imported correctly.');
      }
      const transformResult = await handleProcess(fakeReq, fakeRes, job.data.tier || 'free');
      const transformTime = Date.now() - transformStartTime;
      if (!transformResult || typeof transformResult !== 'object') {
        throw new Error('Transformer did not return a valid result object.');
      }
      if ('error' in transformResult && transformResult.error) {
        throw new Error(`Transformer error: ${transformResult.error}`);
      }
      if (!('rowCount' in transformResult) || typeof transformResult.rowCount !== 'number') {
        throw new Error('Transformer result missing rowCount.');
      }
      if (!transformResult.rowCount || transformResult.rowCount === 0) {
        const processingTime = Date.now() - startTime;
        const errorMsg = `[Worker] No output rows produced for feedId=${feedId}. Marking job as failed.`;
        console.error(errorMsg);
        logJobProgress(feedId, 100, 'failed', errorMsg);
        await supabase.from('feeds').upsert({
          id: feedId,
          filename: fileName || `${feedId}.xlsx`,
          platform: platform,
          status: 'failed',
          upload_time: new Date().toISOString(),
          summary_json: { error: errorMsg, failedReason: errorMsg, processingTime },
          email: email || null,
          category: category || null
        });
        throw new Error(errorMsg);
      }
      
      logJobProgress(feedId, 70, 'optimization', `Optimizing and uploading output for job ${job.id}`);
      await job.updateProgress(70);
      
      // Upload result to Supabase
      console.log(`[Worker] Preparing to upload XLSX to Supabase Storage: feeds/${feedId}.xlsx`);
      const outputXlsxPath = `outputs/${feedId}_output.xlsx`;
      
      if (!fs.existsSync(outputXlsxPath)) {
        console.error(`[Worker] ERROR: Expected XLSX output not found: ${outputXlsxPath}`);
        throw new Error(`Expected XLSX output not found: ${outputXlsxPath}`);
      }
      console.log(`[Worker] Output XLSX exists: ${outputXlsxPath}`);
      
      const xlsxBuffer = fs.readFileSync(outputXlsxPath);
      // const uploadTrace = traceSupabaseOperation('upload', 'feeds', { fileSize: xlsxBuffer.length });
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
      console.log(`[Worker] Supabase upload success: ${publicUrl}`);
      
      logJobProgress(feedId, 90, 'optimization', `Finalizing job ${job.id}`);
      await job.updateProgress(90);
      
      // Save to database
      // const dbTrace = traceDatabaseOperation('upsert', 'feeds', { feedId });
      console.log(`[Worker] Upserting feed record in Supabase for feedId: ${feedId}`);
      
      // Prepare enhanced summary with transformer stats
      const transformerStats = transformResult.stats || {};
      const enhancedSummary = {
        ...(transformResult.summary || {}),
        processingTime: Date.now() - startTime,
        transformTime: transformTime,
        // Ensure we have the basic stats even if summary is missing
        rowCount: transformResult.rowCount || 0,
        category: transformResult.category || category,
        tier: transformResult.tier || job.data.tier || 'free',
        stats: transformResult.stats || {
          totalMapped: 0,
          totalEnriched: 0,
          totalLLMCalls: 0,
          totalErrors: 0,
          cacheHits: 0
        },
        // STANDARDIZED FIELDS - Always at top level for /progress endpoint
        total_rows: transformResult.rowCount || 0,
        processed_rows: transformResult.rowCount || 0,
        total_mapped: transformerStats.totalMapped || 0,
        total_enriched: transformerStats.totalEnriched || 0,
        total_llm_calls: transformerStats.totalLLMCalls || 0,
        total_errors: transformerStats.totalErrors || 0,
        cache_hits: transformerStats.cacheHits || 0
      };
      
      // When upserting completed job, always set message: 'Completed'
      const { data: upsertData, error: dbError } = await supabase.from('feeds').upsert({
        id: feedId,
        filename: fileName || `${feedId}.xlsx`,
        platform: platform,
        status: 'completed',
        upload_time: new Date().toISOString(),
        output_path: publicUrl,
        summary_json: enhancedSummary,
        email: email || null,
        category: transformResult.category || category || null,
        message: 'Completed'
      });
      console.log(`[Worker] Supabase upsert response:`, { upsertData, dbError });
      console.log(`[Worker] Feed record upserted in DB for feedId=${feedId}`);
      // dbTrace.end(dbError);
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
      
      // Record analytics with actual transformer stats
      try {
        console.log(`[Worker] Recording analytics for ${feedId}`);
        
        // Save detailed analytics to the feeds table with real stats
        const analyticsData = {
          feedId,
          jobId: job.id,
          platform,
          category: transformResult.category || category,
          totalRows: transformResult.rowCount || 0,
          processingTime,
          transformTime,
          llmCalls: transformerStats.totalLLMCalls || 0,
          llmErrors: transformerStats.totalErrors || 0,
          cacheHits: transformerStats.cacheHits || 0,
          successRate: transformerStats.totalErrors > 0 ? 95 : 100,
          avgConfidence: 100,
          blankFieldsCount: enhancedSummary.missingRequiredFields?.length || 0,
          warnings: enhancedSummary.warnings || [],
          suggestions: []
        };
        
        // Update the feeds table with analytics data
        const { error: analyticsError } = await supabase.from('feeds').update({
          summary_json: {
            ...enhancedSummary,
            analytics: analyticsData
          }
        }).eq('id', feedId);
        
        if (analyticsError) {
          console.error(`[Worker] Failed to update analytics for ${feedId}:`, analyticsError);
        } else {
          console.log(`[Worker] Analytics updated for ${feedId}:`, analyticsData);
        }
      
        console.log(`[Worker] Analytics recorded for ${feedId}`);
      } catch (analyticsError) {
        console.error(`[Worker] Failed to record analytics for ${feedId}:`, analyticsError);
      }
      
      console.log(`[Worker] ====== JOB END feedId=${feedId} jobId=${job.id} ======`);
      return { 
        status: 'completed', 
        jobId: job.id,
        feedId,
        processingTime,
        transformTime,
        outputUrl: publicUrl
      };
      
    } catch (error: unknown) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Worker] JOB ERROR feedId=${feedId} jobId=${job?.id} after ${processingTime}ms:`, errorMessage);
      if (error instanceof Error && error.stack) {
        console.error(`[Worker] Stack trace:`, error.stack);
      }
      // Save error to database
      try {
        console.log(`[Worker] Upserting failed job to DB for feedId: ${feedId}`);
        await supabase.from('feeds').upsert({
          id: feedId,
          filename: fileName || `${feedId}.xlsx`,
          platform: platform,
          status: 'failed',
          upload_time: new Date().toISOString(),
          summary_json: { error: errorMessage, failedReason: errorMessage, processingTime },
          email: email || null,
          category: category || null,
          message: 'Failed'
        });
      } catch (dbError) {
        console.error(`[Worker] Failed to save error to database:`, dbError);
      }
      // Always throw to mark job as failed in BullMQ
      throw new Error(errorMessage);
    }
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}, { 
  connection,
  concurrency: 4 // Process 4 jobs simultaneously for better throughput
});

feedWorker.on('active', (job) => {
  console.log(`[Worker] Job ${job.id} is now active (feedId: ${job.data.feedId})`);
});

feedWorker.on('completed', (job, result) => {
  if (!job) {
    console.log('[WORKER][EVENT] Job completed: job is undefined');
    return;
  }
  console.log(`[WORKER][EVENT] Job completed: jobId=${job.id}, feedId=${job.data.feedId}, result=`, result);
});

feedWorker.on('failed', (job, err) => {
  if (!job) {
    console.error('[WORKER][EVENT] Job failed: job is undefined');
    return;
  }
  console.error(`[WORKER][EVENT] Job failed: jobId=${job.id}, feedId=${job.data.feedId}, error=`, err);
});

// Export queue for use in API routes
export { feedQueue };

console.log('[WORKER_READY] Worker startup complete, ready to process jobs.'); 