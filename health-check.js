import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:4000/api';

async function healthCheck() {
  console.log('🏥 Starting comprehensive health check...\n');
  
  const tests = [
    {
      name: 'Server Health',
      test: async () => {
        const response = await axios.get(`${BASE_URL}/health`);
        return response.data.status === 'ok';
      }
    },
    {
      name: 'CORS Test',
      test: async () => {
        const response = await axios.get(`${BASE_URL}/cors-test`);
        return response.data.message === 'CORS test successful';
      }
    },
    {
      name: 'Auth Status (Unauthenticated)',
      test: async () => {
        try {
          const response = await axios.get(`${BASE_URL}/auth/user`);
          return false; // Should not reach here
        } catch (error) {
          return error.response.status === 401;
        }
      }
    },
    {
      name: 'File Upload Test',
      test: async () => {
        const form = new FormData();
        form.append('platform', 'walmart');
        form.append('email', 'test@example.com');
        form.append('file', fs.createReadStream('test_vendor_input.csv'));
        
        const response = await axios.post(`${BASE_URL}/simple-upload`, form, {
          headers: form.getHeaders()
        });
        
        return response.data.feed_id && response.data.status === 'queued';
      }
    },
    {
      name: 'Job Status Check',
      test: async () => {
        // First upload a file to get a feed ID
        const form = new FormData();
        form.append('platform', 'walmart');
        form.append('email', 'test@example.com');
        form.append('file', fs.createReadStream('test_vendor_input.csv'));
        
        const uploadResponse = await axios.post(`${BASE_URL}/simple-upload`, form, {
          headers: form.getHeaders()
        });
        
        const feedId = uploadResponse.data.feed_id;
        
        // Wait a bit and check status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await axios.get(`${BASE_URL}/jobs/${feedId}/status`);
        return statusResponse.data.feedId === feedId;
      }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`);
      const passed = await test.test();
      results.push({ name: test.name, passed, error: null });
      console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
    } catch (error) {
      results.push({ name: test.name, passed: false, error: error.message });
      console.log(`   ❌ FAIL: ${error.message}\n`);
    }
  }
  
  console.log('📊 Health Check Summary:');
  console.log('========================');
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All systems are healthy!');
  } else {
    console.log('⚠️  Some systems need attention.');
  }
  
  return passed === total;
}

// Run the health check
healthCheck().catch(console.error); 