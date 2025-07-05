// BullMQ queue and worker setup for LLM enrichment
import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import { traceLLMCall, traceFileOperation, traceDatabaseOperation, traceSupabaseOperation } from './telemetry.js';

// Redis connection (default to localhost for dev)
const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// Create the queue
const feedQueue = new Queue('feed-transform', { connection });

// Worker process for feed transformation
const feedWorker = new Worker('feed-transform', async job => {
  const startTime = Date.now();
  const { feedId, fileBuffer, fields, fileName, platform, email, category } = job.data;
  
  console.log(`[Worker] Starting job ${job.id} for feed ${feedId}`);
  console.log(`[Worker] Platform: ${platform}, Rows: ~${fileBuffer.toString().split('\n').length - 1}`);
  
  try {
    // Update job status to processing
    await job.updateProgress(10);
    
    // Write file buffer to temp location for transformer
    const tempInputPath = `temp_uploads/${feedId}.csv`;
    const fileTrace = traceFileOperation('write', tempInputPath, { size: fileBuffer.length });
    fs.writeFileSync(tempInputPath, fileBuffer, 'utf-8');
    fileTrace.end();
    console.log(`[Worker] Wrote temp file: ${tempInputPath}`);
    
    await job.updateProgress(20);
    
    // Import and call transformer logic
    const { handleProcess } = await import('./utils/transformer.js');
    
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
    console.log(`[Worker] Transformer completed in ${transformTime}ms`);
    
    await job.updateProgress(70);
    
    // Upload result to Supabase
    console.log(`[Worker] Uploading result to Supabase...`);
    const REMOVED_SECRET= (await import('../supabaseClient.js')).default;
    const outputXlsxPath = `outputs/${feedId}_output.xlsx`;
    
    if (!fs.existsSync(outputXlsxPath)) {
      throw new Error(`Expected XLSX output not found: ${outputXlsxPath}`);
    }
    
    const xlsxBuffer = fs.readFileSync(outputXlsxPath);
    const uploadTrace = traceSupabaseOperation('upload', 'feeds', { fileSize: xlsxBuffer.length });
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('feeds')
      .upload(`${feedId}.xlsx`, xlsxBuffer, { 
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        upsert: true 
      });
    uploadTrace.end(uploadError);
    
    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: publicData } = supabase.storage.from('feeds').getPublicUrl(`${feedId}.xlsx`);
    const publicUrl = publicData.publicUrl;
    
    await job.updateProgress(90);
    
    // Save to database
    const dbTrace = traceDatabaseOperation('upsert', 'feeds', { feedId });
    const { error: dbError } = await supabase.from('feeds').upsert({
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
    dbTrace.end(dbError);
    
    if (dbError) {
      throw new Error(`Database save failed: ${dbError.message}`);
    }
    
    await job.updateProgress(100);
    
    const processingTime = Date.now() - startTime;
    console.log(`[Worker] Job ${job.id} completed successfully in ${processingTime}ms`);
    console.log(`[Worker] Breakdown: Transform=${transformTime}ms, Total=${processingTime}ms`);
    
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
    console.error(`[Worker] Job ${job.id} failed after ${processingTime}ms:`, error);
    
    // Save error to database
    try {
      const REMOVED_SECRET= (await import('../supabaseClient.js')).default;
      const dbTrace = traceDatabaseOperation('upsert', 'feeds', { feedId, status: 'failed' });
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
}, { connection });

feedWorker.on('completed', (job, result) => {
  console.log(`[Worker] Job ${job.id} completed:`, result);
});

feedWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed:`, err);
});

// Export queue for use in API routes
export { feedQueue }; 