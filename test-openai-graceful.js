// Test script to verify graceful OpenAI error handling
const fetch = require('node-fetch');

async function testOpenAIEndpoint() {
  try {
    // Test the strategic chat endpoint that uses OpenAI
    const response = await fetch('http://localhost:5000/api/strategic-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Mock auth for testing
      },
      body: JSON.stringify({
        message: 'Test message',
        productContext: {
          productService: 'Test Product'
        }
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (response.status === 200 && result.message) {
      console.log('✅ Graceful error handling working correctly');
    } else {
      console.log('❌ Unexpected response format');
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testOpenAIEndpoint();