# 5Ducks Credit System Documentation

## ⚠️ CRITICAL SYSTEM STATUS (June 19, 2025)

### Active Bug: Replit DB Response Parsing Failure

**Symptom**: Credits show "Loading..." after initial successful creation
**Root Cause**: Replit Database returns wrapped response format `{ ok: true, value: "JSON_STRING" }` but code attempts to parse entire wrapper object instead of extracting `.value` property
**Impact**: All users with existing credit data cannot see their balances
**Status**: Critical - requires immediate fix

### Evidence from Production Logs:
```javascript
// What Replit DB actually returns:
[CreditService] Raw DB data: { ok: true, value: '{"currentBalance":180,...}' }

// What code incorrectly does:
credits = typeof creditsData === 'string' ? JSON.parse(creditsData) : creditsData;
// Results in: credits = { ok: true, value: '...' } (malformed)

// What should happen:
const rawData = creditsData.value || creditsData;
credits = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
// Results in: credits = { currentBalance: 180, ... } (correct)
```

### Required Fix Location:
File: `server/lib/credits/index.ts`, Line ~29
Change data extraction logic to handle Replit DB response wrapper format.

## Overview

The 5Ducks credit system provides a coin-based usage tracking and billing mechanism for B2B prospecting searches. Users receive 5000 credits monthly and are charged based on search complexity and scope.

## System Architecture

### Storage Layer
- **Persistence**: Replit Database with JSON serialization
- **Key Pattern**: `user_credits:${userId}`
- **Data Structure**: UserCredits interface with balance, transactions, and metadata

### Core Components
- **CreditService**: Main business logic class (`server/lib/credits/index.ts`)
- **Credit Routes**: REST API endpoints (`server/routes/credits.ts`)
- **Frontend Display**: Real-time credit balance UI (`client/src/components/credits-display.tsx`)

## Credit Pricing Structure

### Search Type Costs
| Search Type | Credits | Description |
|-------------|---------|-------------|
| Company Search | 10 | Basic company discovery only |
| Company + Contacts | 70 | Companies with contact extraction |
| Full Search (Company + Contacts + Emails) | 240 | Complete prospecting workflow |
| Individual Email Discovery | 20 | Per-contact email enrichment |

### Monthly Allowance
- **Base Allocation**: 5000 credits per month
- **Reset Date**: 1st of each month
- **Auto-Unblocking**: Users are automatically unblocked on monthly reset

## API Reference

### GET /api/credits
Returns current user credit status
```json
{
  "balance": 4750,
  "isBlocked": false,
  "lastTopUp": 1640995200000,
  "totalUsed": 250,
  "monthlyAllowance": 5000
}
```

### GET /api/credits/history
Returns transaction history with optional limit parameter
```json
[
  {
    "type": "debit",
    "amount": 240,
    "description": "Full search: Series-A Fintech companies",
    "timestamp": 1640995200000,
    "searchType": "company_contacts_emails",
    "success": true
  }
]
```

### GET /api/credits/stats
Returns usage statistics and analytics
```json
{
  "totalSearches": 12,
  "averageCreditsPerSearch": 85,
  "mostUsedSearchType": "company_contacts_emails",
  "creditsRemainingPercent": 95
}
```

### POST /api/credits/adjust
Manual credit adjustment (admin function)
```json
{
  "amount": 1000,
  "description": "Bonus credits for feedback"
}
```

## Core Functionality

### Automatic Top-ups
The system automatically checks for monthly top-ups when users access their credits:
- Compares current month/year with last top-up date
- Adds 5000 credits on the 1st of each month
- Removes blocking status on refresh
- Creates transaction record for audit trail

### Credit Deduction Flow
1. **Pre-Search Validation**: Check if user has sufficient credits
2. **Search Execution**: Process the actual search request
3. **Post-Search Billing**: Deduct credits based on search type
4. **Blocking Logic**: Block user if balance goes negative

### Blocking System
- **Trigger**: Balance drops below 0 credits
- **Behavior**: Prevents new searches, displays warning messages
- **Recovery**: Automatic unblock on monthly reset or manual credit addition

## Frontend Integration

### Credit Display Component
Shows real-time credit status in navigation:
- **Green**: Healthy balance (500+ credits)
- **Yellow**: Low credits (100-499)
- **Orange**: Critical (1-99)
- **Red**: Blocked (negative balance)

### Visual States
```typescript
// Color coding based on credit levels
const isLow = credits.balance < 500;
const isCritical = credits.balance < 100;
const isBlocked = credits.isBlocked;
```

## Database Schema

### UserCredits Interface
```typescript
interface UserCredits {
  currentBalance: number;
  lastTopUp: number;           // Unix timestamp
  totalUsed: number;
  isBlocked: boolean;
  transactions: CreditTransaction[];
  monthlyAllowance: number;
  createdAt: number;
  updatedAt: number;
}
```

### CreditTransaction Interface
```typescript
interface CreditTransaction {
  type: 'debit' | 'credit';
  amount: number;
  description: string;
  timestamp: number;
  searchType?: string;
  success?: boolean;
}
```

## Error Handling

### Database Errors
- Graceful fallback to default credit allocation
- Automatic retry logic for transient failures
- Detailed error logging with user context

### JSON Parsing Errors
- Safe parsing with type checking
- Fallback to default credits on corruption
- Error logging for debugging

### Rate Limiting
- Credit validation before expensive operations
- Blocking mechanism prevents abuse
- Clear user feedback on insufficient credits

## Current Critical Investigation

### Issue Analysis (June 19, 2025)

**Problem Flow Identified:**
1. New users register → 180 credits created successfully
2. Replit DB stores credits as: `{ ok: true, value: '{"currentBalance":180,...}' }`
3. CreditService attempts to parse wrapper object instead of `.value`
4. Results in malformed credit object: `{ ok: true, value: '...' }`
5. API returns `{ balance: undefined }` causing frontend "Loading..." state

**Critical Hypotheses:**

**Hypothesis A: Data Extraction Bug (CONFIRMED)**
- Replit DB API differs from expected interface
- Success responses wrap data in `{ ok: true, value: "..." }` format
- Code assumes direct JSON string or object response
- Evidence: Production logs show wrapper format consistently

**Hypothesis B: React State Management (SECONDARY)**
- Duplicate key warnings in template components
- May cause CreditsDisplay re-render issues
- Less critical than parsing bug but contributes to instability

**Hypothesis C: API Response Chain Failure (DOWNSTREAM)**
- Credit parsing succeeds but wrong object structure passed
- Route handler accesses undefined properties
- Frontend defensive programming correctly shows loading state

### Investigation Commands

**Backend Verification:**
```bash
# Check exact Replit DB response format
grep -A 5 "Raw DB data for user" server-logs

# Verify credit creation vs parsing
grep -B 2 -A 2 "initial credits" server-logs

# Monitor API response structure
grep "Sending response" server-logs
```

**Frontend Testing:**
```bash
# Direct API test
curl -H "Authorization: Bearer TOKEN" /api/credits

# Check TanStack Query cache state
# Browser DevTools → Components → TanStack Query
```

**Database State Verification:**
```bash
# Manual Replit DB inspection needed
# Check actual stored format for user 292
# Verify key structure: user_credits:292
```

## Troubleshooting

### Critical Issues (Active)

#### Credits Show "Loading..." After Creation
**Status: CRITICAL - Active Bug**
1. **Immediate Fix Required**: Extract `.value` from Replit DB responses
2. **Location**: `server/lib/credits/index.ts` line 27-35
3. **Test**: New user registration should show 180 credits immediately
4. **Verification**: Existing users should display correct balances

#### Replit DB Response Format Mismatch
**Root Cause Identified**
1. Expected: `"JSON_STRING"` or `{ currentBalance: 180 }`
2. Actual: `{ ok: true, value: "JSON_STRING" }`
3. Solution: Add wrapper extraction logic
4. Impact: Affects all credit operations for existing users

### Legacy Issues

#### Monthly Top-up Not Working
1. Verify date comparison logic in `checkAndApplyMonthlyTopUp`
2. Check if `lastTopUp` timestamp is correctly stored
3. Ensure top-up runs on credit access, not scheduled

#### Blocking Not Working
1. Confirm balance calculation in `deductCredits`
2. Check if `isBlocked` flag is properly set
3. Verify frontend displays blocking state correctly

### Debugging Tools

#### Credit Inspection
```bash
# Check raw credit data in Replit DB
curl -X GET "https://your-app.replit.dev/api/credits" \
  -H "Authorization: Bearer <token>"
```

#### Transaction History
```bash
# View recent transactions
curl -X GET "https://your-app.replit.dev/api/credits/history?limit=10" \
  -H "Authorization: Bearer <token>"
```

## Admin Operations

### Manual Credit Adjustment
```typescript
// Add bonus credits
await CreditService.adjustCredits(userId, 1000, "Promotional bonus");

// Deduct credits for refund
await CreditService.adjustCredits(userId, -500, "Refund processed");
```

### User Unblocking
```typescript
// Unblock user by adding minimal credits
await CreditService.adjustCredits(userId, 100, "Admin unblock");
```

### Bulk Operations
For multiple users, iterate through user list:
```typescript
for (const userId of userIds) {
  await CreditService.adjustCredits(userId, amount, description);
}
```

## Integration Points

### Search Pipeline Integration
The credit system integrates with the search flow at key points:
1. **Pre-search**: `CreditService.isUserBlocked(userId)`
2. **Post-search**: `CreditService.deductCredits(userId, searchType)`
3. **UI Updates**: Real-time balance display

### Authentication Integration
Credits are tied to authenticated users:
- Firebase Auth provides user identity
- User ID links credits to specific accounts
- Session management ensures consistent access

## Performance Considerations

### Caching Strategy
- Credits are fetched on each request (real-time accuracy)
- Frontend refetches every 30 seconds
- No aggressive caching to prevent stale balances

### Database Optimization
- Single key-value operations for speed
- JSON serialization keeps data lightweight
- Minimal transaction history storage

### Scalability Notes
- Current implementation handles moderate user loads
- For high-scale deployments, consider:
  - Redis for faster credit lookups
  - Batch transaction processing
  - Separated audit log storage

## Future Enhancements

### Planned Features
1. **Credit Packages**: Premium credit purchasing
2. **Team Credits**: Shared credit pools for organizations
3. **Usage Analytics**: Detailed consumption insights
4. **Credit Expiration**: Time-based credit lifecycle
5. **Tier System**: Different monthly allowances by plan

### Integration Opportunities
1. **Stripe Integration**: Paid credit top-ups
2. **Usage Alerts**: Email notifications for low credits
3. **Admin Dashboard**: Credit management interface
4. **API Webhooks**: External system notifications

## Security Considerations

### Access Control
- User can only access their own credits
- Admin endpoints require elevated permissions
- API endpoints validate authentication

### Data Integrity
- All credit operations are atomic
- Transaction logs provide audit trail
- Balance validation prevents negative exploits

### Privacy
- Credit data is user-specific and isolated
- No cross-user data leakage
- Secure storage in Replit DB

---

*Last Updated: June 19, 2025*
*Version: 1.0.0*