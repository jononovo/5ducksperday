// Debug script to manually activate subscription for user 365
const fetch = require('node-fetch');

async function activateSubscription() {
  try {
    // Simulate the webhook that should have fired
    const webhookPayload = {
      id: 'evt_manual_activation',
      object: 'event',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_manual_365',
          object: 'subscription',
          status: 'active',
          created: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
          metadata: {
            userId: '365',
            planId: 'ugly-duckling'
          }
        }
      }
    };

    const response = await fetch('http://localhost:5000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookPayload)
    });

    console.log('Manual activation response:', response.status);
    
    // Check credits after activation
    const creditsResponse = await fetch('http://localhost:5000/api/credits/365');
    const credits = await creditsResponse.json();
    console.log('Credits after activation:', credits.currentBalance);
    
  } catch (error) {
    console.error('Manual activation failed:', error.message);
  }
}

activateSubscription();