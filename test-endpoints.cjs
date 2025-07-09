#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');

const BASE_URL = 'http://localhost:4000';
const FRONTEND_URL = 'http://localhost:5173';

const endpoints = [
  // Health and status
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  { path: '/health', method: 'GET', name: 'Basic Health' },
  
  // Auth endpoints
  { path: '/api/auth/user', method: 'GET', name: 'Auth User' },
  { path: '/api/auth/google', method: 'GET', name: 'Google Auth' },
  { path: '/api/auth/google/callback', method: 'GET', name: 'Google Callback' },
  
  // Upload and processing
  { path: '/api/simple-upload', method: 'GET', name: 'Simple Upload (GET)' },
  
  // Analytics endpoints
  { path: '/api/analytics/dashboard', method: 'GET', name: 'Analytics Dashboard' },
  { path: '/api/analytics/jobs', method: 'GET', name: 'Analytics Jobs' },
  { path: '/api/analytics/fields', method: 'GET', name: 'Analytics Fields' },
  
  // Platform endpoints
  { path: '/api/platforms/walmart/categories', method: 'GET', name: 'Walmart Categories' },
  
  // Stripe endpoints
  { path: '/api/stripe/create-checkout-session', method: 'POST', name: 'Stripe Checkout', hasBody: true },
  
  // Job status endpoint
  { path: '/api/jobs/test/status', method: 'GET', name: 'Job Status' }
];

const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function makeRequest(url, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Jadoo-Test-Script/1.0'
      },
      timeout: 5000
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const client = url.startsWith('https') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function testEndpoint(endpoint) {
  try {
    const url = `${BASE_URL}${endpoint.path}`;
    const body = endpoint.hasBody ? JSON.stringify({ test: true }) : null;
    
    const response = await makeRequest(url, endpoint.method, body);
    
    if (response.statusCode === 404) {
      results.failed++;
      results.errors.push(`❌ ${endpoint.name}: 404 Not Found`);
      return false;
    } else if (response.statusCode >= 500) {
      results.failed++;
      results.errors.push(`❌ ${endpoint.name}: ${response.statusCode} Server Error`);
      return false;
    } else {
      results.passed++;
      console.log(`✅ ${endpoint.name}: ${response.statusCode}`);
      return true;
    }
  } catch (error) {
    results.failed++;
    results.errors.push(`❌ ${endpoint.name}: ${error.message}`);
    return false;
  }
}

async function testFrontend() {
  try {
    const response = await makeRequest(FRONTEND_URL);
    if (response.statusCode === 200) {
      console.log(`✅ Frontend: ${response.statusCode} - Loads successfully`);
      results.passed++;
    } else {
      console.log(`❌ Frontend: ${response.statusCode} - Failed to load`);
      results.failed++;
    }
  } catch (error) {
    console.log(`❌ Frontend: ${error.message}`);
    results.failed++;
  }
}

// Add extra tests for unknown API and frontend routes
async function testUnknownRoutes() {
  // Unknown API endpoint
  const api404 = await makeRequest(BASE_URL + '/api/unknown-endpoint');
  if (api404.statusCode === 404 && api404.headers['content-type'] && api404.headers['content-type'].includes('application/json')) {
    console.log('✅ Unknown API endpoint returns JSON 404');
    results.passed++;
  } else {
    console.log('❌ Unknown API endpoint does not return JSON 404');
    results.failed++;
    results.errors.push('Unknown API endpoint did not return JSON 404');
  }

  // Unknown frontend route
  const fe404 = await makeRequest(FRONTEND_URL + '/some-unknown-frontend-route');
  if (fe404.statusCode === 200 && fe404.headers['content-type'] && fe404.headers['content-type'].includes('text/html')) {
    console.log('✅ Unknown frontend route returns HTML (SPA fallback)');
    results.passed++;
  } else {
    console.log('❌ Unknown frontend route does not return HTML');
    results.failed++;
    results.errors.push('Unknown frontend route did not return HTML');
  }
}

async function runTests() {
  console.log('🚀 Starting comprehensive endpoint tests...\n');
  
  // Test frontend first
  await testFrontend();
  console.log('');
  
  // Test all backend endpoints
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }

  // Test unknown routes
  await testUnknownRoutes();
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors Found:');
    results.errors.forEach(error => console.log(error));
  }
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! No 404s or server errors found.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }
}

// Run the tests
runTests().catch(console.error); 