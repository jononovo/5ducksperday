# Comprehensive Search Credit Billing Test Documentation

## Overview
This document outlines the expected behavior for comprehensive email search credit billing in the 5Ducks application.

## Expected Behavior

### 1. Individual Searches (Manual Mode)
When a user clicks on individual search buttons (Apollo, Hunter, or Perplexity):
- **Credit Check**: System checks if user has at least 20 credits
- **Credit Billing**: If email is found, 20 credits are deducted immediately
- **Total Cost**: 20 credits per search

### 2. Comprehensive Search (Smart Search)
When a user clicks the Mail icon for comprehensive search:
- **Credit Check**: System checks if user has at least 20 credits (not 60)
- **Search Sequence**: Apollo → Perplexity → Hunter (stops when email found)
- **Credit Billing**: 
  - Individual searches DO NOT bill credits (searchContext='automated')
  - Only ONE billing of 20 credits occurs when email is found
  - If no email found, NO credits are deducted
- **Total Cost**: Maximum 20 credits regardless of how many sources checked

## Implementation Details

### Credit Billing Logic in Mutations (home.tsx)
```javascript
// Apollo, Hunter, Perplexity mutations all check:
if (emailFound && searchContext === 'manual') {
  // Bill 20 credits
}
// Skip billing when searchContext === 'automated'
```

### Comprehensive Search Billing
```javascript
// After finding email in any source:
if (updatedContact.email) {
  // Bill 20 credits once for the entire comprehensive search
  await apiRequest("POST", "/api/credits/deduct-individual-email", {
    contactId,
    searchType: 'comprehensive',
    emailFound: true
  });
}
```

## Test Scenarios

### Scenario 1: Email found via Apollo in comprehensive search
- User has 100 credits
- Clicks Mail icon (comprehensive search)
- Apollo finds email immediately
- Expected: 20 credits deducted, user has 80 credits remaining

### Scenario 2: Email found via Hunter after trying all sources
- User has 100 credits  
- Clicks Mail icon (comprehensive search)
- Apollo: No email found (no billing)
- Perplexity: No email found (no billing)
- Hunter: Email found
- Expected: 20 credits deducted total, user has 80 credits remaining

### Scenario 3: No email found after checking all sources
- User has 100 credits
- Clicks Mail icon (comprehensive search)
- All three sources checked, no email found
- Expected: 0 credits deducted, user still has 100 credits

### Scenario 4: Individual Apollo search
- User has 100 credits
- Clicks Apollo button directly (not comprehensive search)
- Apollo finds email
- Expected: 20 credits deducted, user has 80 credits remaining

## Files Modified
- `client/src/pages/home.tsx`
  - Updated all mutations to check searchContext
  - Added comprehensive billing at search completion
  - Fixed credit check from 60 to 20
  
- `client/src/pages/outreach.tsx`
  - Updated comprehensive search billing logic
  - Fixed credit check from 60 to 20
  - Added billing at search completion

## Verification Steps
1. Login to the application
2. Search for companies and contacts
3. Try comprehensive search with sufficient credits (>20)
4. Verify only 20 credits deducted when email found
5. Try individual searches and verify 20 credits deducted each
6. Try comprehensive search with insufficient credits (<20) and verify error message