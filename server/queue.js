// CommonJS wrapper for feedQueue from queue.ts
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null
});

const feedQueue = new Queue('feed-transform', { connection });

module.exports = { feedQueue }; 