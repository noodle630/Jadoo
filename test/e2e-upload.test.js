const request = require('supertest');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const API_URL = process.env.API_URL || 'http://localhost:4000/api';
const SAMPLE_CSV = path.join(__dirname, '../attached_assets/test_vendor_input.csv');

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
  });

  it('should process the job and produce output', async () => {
    // Poll job status
    let status = 'queued';
    let tries = 0;
    let outputUrl = null;
    while (status !== 'completed' && tries < 30) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await request(API_URL).get(`/jobs/${feedId}/status`);
      if (res.body.status === 'completed') {
        status = 'completed';
        outputUrl = res.body.returnvalue?.outputUrl;
      }
      tries++;
    }
    assert.strictEqual(status, 'completed', 'Job did not complete in time');
    assert(outputUrl, 'No output URL produced');
    // Optionally: download and check output file
    // const fileRes = await request(outputUrl).get('/');
    // assert.strictEqual(fileRes.status, 200);
  });
}); 