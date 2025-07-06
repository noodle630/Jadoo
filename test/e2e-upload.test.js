import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'assert';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const SAMPLE_CSV = path.join(__dirname, '../test_vendor_input.csv');

describe('E2E: /api/simple-upload', function() {
  this.timeout(30000); // 30s for async job
  let feedId;

  it('should upload a file and enqueue a job', async () => {
    const res = await request(API_URL)
      .post('/simple-upload')
      .field('platform', 'walmart')
      .field('email', 'dev@local.test')
      .attach('file', SAMPLE_CSV);
    assert.strictEqual(res.status, 200);
    assert(res.body.feed_id, 'feed_id missing');
    feedId = res.body.feed_id;
    console.log('✅ Upload successful, feed_id:', feedId);
  });

  it('should process the job and produce output', async () => {
    // Poll job status
    let status = 'queued';
    let tries = 0;
    let outputUrl = null;
    while (status !== 'completed' && tries < 30) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await request(API_URL).get(`/jobs/${feedId}/status`);
      console.log(`🔄 Job status (attempt ${tries + 1}):`, res.body.status);
      if (res.body.status === 'completed') {
        status = 'completed';
        outputUrl = res.body.returnvalue?.outputUrl;
      }
      tries++;
    }
    assert.strictEqual(status, 'completed', 'Job did not complete in time');
    assert(outputUrl, 'No output URL produced');
    console.log('✅ Job completed successfully, output URL:', outputUrl);
  });
}); 