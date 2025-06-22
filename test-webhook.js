// Test webhook simulation for Stripe integration
const axios = require('axios');

const testWebhookEvent = {
  id: 'evt_test_webhook',
  object: 'event',
  api_version: '2023-10-16',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'sub_test123',
      object: 'subscription',
      status: 'active',
      created: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      metadata: {
        userId: '1', // Test user ID
        planId: 'ugly-duckling'
      }
    }
  },
  type: 'customer.subscription.created'
};

async function testWebhook() {
  try {
    console.log('Testing webhook endpoint...');
    const response = await axios.post('http://localhost:5000/api/stripe/webhook', testWebhookEvent, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-signature' // This will be ignored for now
      }
    });
    
    console.log('Webhook test response:', response.status, response.data);
  } catch (error) {
    console.error('Webhook test failed:', error.response?.data || error.message);
  }
}

testWebhook();