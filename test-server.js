/**
 * Simple test script for the outreach agent server
 * Tests the POST /agent/outreach endpoint with sample data
 */

const http = require('http');

// Sample test data
const testData = {
  prospectData: {
    role: 'VP of Engineering',
    companyContext: {
      name: 'TechCorp Inc',
      industry: 'Software',
      size: 'medium'
    },
    contactDetails: {
      name: 'John Smith',
      email: 'john.smith@techcorp.com'
    }
  },
  intentSignals: [
    {
      type: 'funding_event',
      description: 'Company raised Series B funding',
      timestamp: new Date('2024-01-15').toISOString(),
      relevanceScore: 0.9,
      source: 'TechCrunch'
    },
    {
      type: 'technology_adoption',
      description: 'Migrating to cloud infrastructure',
      timestamp: new Date('2024-01-10').toISOString(),
      relevanceScore: 0.8,
      source: 'LinkedIn'
    }
  ]
};

function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(postData && { 'Content-Length': Buffer.byteLength(postData) })
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Intent-Driven Cold Outreach Agent Server...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣ Testing health endpoint...');
    const healthResponse = await testEndpoint('/health', 'GET');
    console.log(`   Status: ${healthResponse.statusCode}`);
    console.log(`   Response: ${JSON.stringify(healthResponse.body, null, 2)}\n`);

    // Test 2: Main outreach endpoint
    console.log('2️⃣ Testing outreach endpoint...');
    const outreachResponse = await testEndpoint('/agent/outreach', 'POST', testData);
    console.log(`   Status: ${outreachResponse.statusCode}`);
    
    if (outreachResponse.body.success) {
      console.log('   ✅ SUCCESS! Outreach processing completed');
      console.log(`   Confidence: ${outreachResponse.body.data.intentConfidence}`);
      console.log(`   Message length: ${outreachResponse.body.data.recommendedMessage.length} characters`);
      console.log(`   Processing time: ${outreachResponse.body.data.processingMetadata.serverProcessingTime}ms`);
      console.log(`   Message preview: "${outreachResponse.body.data.recommendedMessage.substring(0, 100)}..."`);
    } else {
      console.log('   ❌ FAILED! Outreach processing error');
      console.log(`   Error: ${outreachResponse.body.error.message}`);
    }
    console.log();

    // Test 3: Invalid endpoint
    console.log('3️⃣ Testing invalid endpoint...');
    const invalidResponse = await testEndpoint('/invalid', 'GET');
    console.log(`   Status: ${invalidResponse.statusCode}`);
    console.log(`   Response: ${JSON.stringify(invalidResponse.body, null, 2)}\n`);

    // Test 4: Invalid request body
    console.log('4️⃣ Testing invalid request body...');
    const invalidBodyResponse = await testEndpoint('/agent/outreach', 'POST', { invalid: 'data' });
    console.log(`   Status: ${invalidBodyResponse.statusCode}`);
    console.log(`   Response: ${JSON.stringify(invalidBodyResponse.body, null, 2)}\n`);

    console.log('🎉 All tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the server is running with: npm start');
  }
}

// Run tests
runTests();