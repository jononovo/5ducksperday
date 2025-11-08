import { TokenService } from './server/features/billing/tokens/service.js';

async function testGmailRefresh() {
  console.log('Testing Gmail token refresh mechanism...');
  
  try {
    // Test with user ID 1 (which has an expired token)
    const userId = 1;
    
    console.log(`\nChecking Gmail auth for user ${userId}...`);
    const hasAuth = await TokenService.hasValidGmailAuth(userId);
    
    console.log(`\nResult: hasValidGmailAuth = ${hasAuth}`);
    
    // Check the token status after the call
    const tokens = await TokenService.getUserTokens(userId);
    const validationResult = TokenService.isTokenValid(tokens);
    
    console.log('\nToken status after check:');
    console.log(`- Is valid: ${validationResult.isValid}`);
    console.log(`- Is expired: ${validationResult.isExpired}`);
    console.log(`- Needs refresh: ${validationResult.needsRefresh}`);
    console.log(`- Remaining time: ${validationResult.remainingTime}ms`);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  process.exit(0);
}

// Initialize database connection
import { db } from './server/db.js';

testGmailRefresh();