// CommonJS wrapper for feedQueue from queue.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
});

const feedQueue = new Queue('feed-transform', { connection });

module.exports = { feedQueue }; 