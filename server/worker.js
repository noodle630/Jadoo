import 'dotenv/config';
// Dedicated BullMQ worker entrypoint for production/QA
console.log('[Worker Entrypoint] Starting BullMQ worker for feed-transform jobs...');
import './queue.js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[WORKER_STARTUP] FATAL: SUPABASE_SERVICE_ROLE_KEY is missing! Exiting.');
  process.exit(1);
}
console.log('[WORKER_STARTUP] ENV', {
  REDIS_URL: process.env.REDIS_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***set***' : '***missing***',
  NODE_ENV: process.env.NODE_ENV
}); 