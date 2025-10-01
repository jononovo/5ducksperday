#!/usr/bin/env tsx

/**
 * Add Credits to Demo User Script
 * 
 * This script adds credits to the demo user account (demo@5ducks.ai, ID: 1)
 * 
 * Usage: npm run add-demo-credits
 */

import { CreditService } from '../server/features/billing/credits/service.js';

async function addDemoCredits() {
  const DEMO_USER_ID = 1;
  const CREDITS_TO_ADD = 5000;
  
  console.log('🦆 Adding credits to demo user...\n');

  try {
    // Get current balance
    const currentBalance = await CreditService.getCreditBalance(DEMO_USER_ID);
    console.log(`📊 Current balance: ${currentBalance} credits`);
    
    // Add credits
    console.log(`💰 Adding ${CREDITS_TO_ADD} credits...`);
    const result = await CreditService.adjustCredits(
      DEMO_USER_ID,
      CREDITS_TO_ADD,
      `Admin credit top-up - ${new Date().toLocaleDateString()}`
    );
    
    if (result.success) {
      console.log(`✅ Successfully added ${CREDITS_TO_ADD} credits!`);
      console.log(`📈 New balance: ${result.newBalance} credits`);
      console.log(`🔓 Account blocked: ${result.isBlocked ? 'Yes' : 'No'}`);
    } else {
      console.error('❌ Failed to add credits');
    }

    console.log('\n🎉 Operation complete!');

  } catch (error) {
    console.error('❌ Error adding credits:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the script
addDemoCredits();
