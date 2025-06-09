// Test script to verify session system functionality
async function testSessionSystem() {
  console.log('Testing session system...');
  
  // Test 1: Create a new session
  console.log('\n1. Testing session creation via quick search...');
  try {
    const quickSearchResponse = await fetch('/api/companies/quick-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'test restaurants in NYC',
        sessionId: 'test-session-123'
      })
    });
    
    const quickData = await quickSearchResponse.json();
    console.log('Quick search response:', {
      companies: quickData.companies?.length || 0,
      sessionId: quickData.sessionId,
      query: quickData.query
    });
  } catch (error) {
    console.error('Quick search failed:', error);
  }
  
  // Test 2: Check session status
  console.log('\n2. Testing session status endpoint...');
  try {
    const sessionResponse = await fetch('/api/search-sessions/test-session-123');
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('Session status:', {
        id: sessionData.sessionId,
        status: sessionData.status,
        hasQuickResults: !!sessionData.quickResults,
        hasFullResults: !!sessionData.fullResults
      });
    } else {
      console.log('Session not found or error:', sessionResponse.status);
    }
  } catch (error) {
    console.error('Session status check failed:', error);
  }
  
  // Test 3: Test full search with session
  console.log('\n3. Testing full search with session...');
  try {
    const fullSearchResponse = await fetch('/api/companies/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'test restaurants in NYC',
        sessionId: 'test-session-123',
        includeContacts: true
      })
    });
    
    const fullData = await fullSearchResponse.json();
    console.log('Full search response:', {
      companies: fullData.companies?.length || 0,
      totalContacts: fullData.companies?.reduce((sum, c) => sum + (c.contacts?.length || 0), 0) || 0,
      sessionId: fullData.sessionId
    });
  } catch (error) {
    console.error('Full search failed:', error);
  }
  
  // Test 4: Final session status check
  console.log('\n4. Final session status check...');
  try {
    const finalSessionResponse = await fetch('/api/search-sessions/test-session-123');
    if (finalSessionResponse.ok) {
      const finalSessionData = await finalSessionResponse.json();
      console.log('Final session status:', {
        id: finalSessionData.sessionId,
        status: finalSessionData.status,
        hasQuickResults: !!finalSessionData.quickResults,
        hasFullResults: !!finalSessionData.fullResults,
        quickResultsCount: finalSessionData.quickResults?.length || 0,
        fullResultsCount: finalSessionData.fullResults?.length || 0
      });
    }
  } catch (error) {
    console.error('Final session check failed:', error);
  }
}

// Run the test
if (typeof window !== 'undefined') {
  // Browser environment
  testSessionSystem();
} else {
  // Node.js environment
  module.exports = testSessionSystem;
}