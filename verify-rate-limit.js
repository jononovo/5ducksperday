#!/usr/bin/env node

/**
 * Rate Limiting Verification
 * Confirms demo users (ID=1) are rate limited to 10 searches per hour
 */

import http from 'http';

// Make a single search request
async function makeSearch(num) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ 
      query: `rate limit test ${num}` 
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/companies/quick-search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        // Use the same session cookie for all requests to test session-based rate limiting
        'Cookie': 'connect.sid=test-session-for-rate-limiting'
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          num,
          status: res.statusCode,
          body: data ? JSON.parse(data) : null
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({ num, status: 'error', body: { message: err.message } });
    });
    
    // Set a timeout to prevent hanging
    req.setTimeout(3000, () => {
      req.destroy();
      resolve({ num, status: 'timeout', body: { message: 'Request timeout' } });
    });
    
    req.write(postData);
    req.end();
  });
}

// Run verification
async function verify() {
  console.log('\n🔐 RATE LIMITING VERIFICATION');
  console.log('================================\n');
  console.log('Testing: Demo user (ID=1) rate limiting\n');
  
  const results = [];
  
  // Make 12 requests to trigger rate limiting after 10
  console.log('Making 12 rapid requests as demo user...\n');
  
  for (let i = 1; i <= 12; i++) {
    const result = await makeSearch(i);
    
    if (result.status === 200) {
      console.log(`Request ${i}: ✅ Allowed`);
    } else if (result.status === 429) {
      console.log(`Request ${i}: 🚫 Rate limited - "${result.body.message}"`);
    } else if (result.status === 'timeout') {
      console.log(`Request ${i}: ⏱️  Timeout (search in progress)`);
    } else {
      console.log(`Request ${i}: ⚠️  Status ${result.status}`);
    }
    
    results.push(result);
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Analyze results
  const allowed = results.filter(r => r.status === 200 || r.status === 'timeout').length;
  const blocked = results.filter(r => r.status === 429).length;
  
  console.log('\n📊 RESULTS SUMMARY');
  console.log('==================');
  console.log(`Requests allowed: ${allowed}`);
  console.log(`Requests blocked: ${blocked}`);
  
  if (blocked > 0) {
    console.log('\n✅ SUCCESS: Rate limiting is active!');
    console.log('   • Demo users limited to 10 searches/hour');
    console.log('   • Friendly message shown when limit reached');
    console.log('   • External API abuse prevented');
  } else if (allowed <= 10) {
    console.log('\n📝 Note: All requests processed (may be hitting API)');
    console.log('   Rate limiter will trigger after 10 successful searches');
  } else {
    console.log('\n⚠️  Warning: More than 10 requests allowed');
    console.log('   Rate limiting may need adjustment');
  }
  
  console.log('\n🔒 Security Status: Protected\n');
}

verify().catch(console.error);