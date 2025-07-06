import { Queue } from 'bullmq';
import IORedis from 'ioredis';

console.log('[DEBUG] REDIS_URL:', process.env.REDIS_URL);

const connection = new IORedis(process.env.REDIS_URL);
const queue = new Queue('test-queue', { connection });

queue.add('test-job', { hello: 'world' })
  .then(() => {
    console.log('Job added!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Failed to add job:', err);
    process.exit(1);
  }); 