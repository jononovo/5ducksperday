# KV Database to PostgreSQL Migration Plan

## Executive Summary
This document outlines the technical implementation plan for migrating 5Ducks from a dual-storage architecture (PostgreSQL + Replit KV Database) to a unified PostgreSQL-only solution with memory caching for performance optimization.

## Background

### Current Architecture
The 5Ducks platform currently uses a split storage strategy:
- **PostgreSQL**: Stores structured data (users, companies, contacts, email_templates, strategic_profiles)
- **Replit KV Database**: Stores volatile/high-access data (credits, Gmail tokens, subscriptions, notifications)

### Motivation for Migration
1. **Data Consistency**: Cannot maintain ACID transactions across two separate databases
2. **Query Limitations**: Cannot perform JOIN operations between KV and PostgreSQL data
3. **Maintenance Complexity**: Two backup strategies, two monitoring systems, two failure points
4. **Debugging Difficulty**: Data relationships split across systems make troubleshooting complex
5. **Audit Trail**: KV Database lacks built-in history/audit capabilities for critical business data

## Pros and Cons Analysis

### Pros of Migration
- **Single Source of Truth**: All data in one ACID-compliant database
- **Complex Queries**: Enable queries like "users with credits > 100 AND active subscription"
- **Transactional Integrity**: Atomic operations across all data types
- **Simplified Backup**: Single database dump captures entire application state
- **Audit Capabilities**: PostgreSQL can track all changes with timestamps and user IDs
- **Cost Reduction**: Eliminate KV Database usage/limits
- **Better Debugging**: All data relationships visible in one system
- **Standard Tooling**: Use standard PostgreSQL tools for monitoring, optimization

### Cons of Migration
- **Initial Performance Impact**: ~10-20ms PostgreSQL queries vs ~2-5ms KV lookups
- **Database Load Increase**: All operations now hit PostgreSQL
- **Migration Complexity**: Need careful planning to avoid data loss
- **Connection Pool Management**: Must optimize PostgreSQL connection handling

### Performance Mitigation
The performance impact is mitigated through:
1. Server-side memory caching (0ms for hot data)
2. Browser-side caching via React Query
3. PostgreSQL query optimization and indexing

## Technical Implementation Plan

### Phase 1: Database Schema Preparation

#### 1.1 Create New Tables in PostgreSQL
```sql
-- User credits table
CREATE TABLE user_credits (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  total_purchased INTEGER NOT NULL DEFAULT 0,
  total_used INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Credit transactions for audit trail
CREATE TABLE credit_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'purchase', 'deduction', 'refund', 'bonus'
  reason VARCHAR(255),
  balance_after INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subscriptions table
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'active', 'cancelled', 'past_due'
  plan_type VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gmail tokens table
CREATE TABLE gmail_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP,
  email VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications tracking
CREATE TABLE user_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  notification_id INTEGER NOT NULL,
  shown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, notification_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_gmail_tokens_user_id ON gmail_tokens(user_id);
```

#### 1.2 Update Drizzle Schema
Add corresponding schema definitions in `shared/schema.ts`:
```typescript
export const userCredits = pgTable('user_credits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  balance: integer('balance').notNull().default(0),
  totalPurchased: integer('total_purchased').notNull().default(0),
  totalUsed: integer('total_used').notNull().default(0),
  lastUpdated: timestamp('last_updated').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

// Add similar definitions for other tables
```

### Phase 2: Memory Cache Implementation

#### 2.1 Create Memory Cache Service
Create `server/lib/memCache.ts`:
```typescript
interface CacheEntry<T> {
  value: T;
  expires: number;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }

  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    const expires = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expires });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}

export const memCache = new MemoryCache();
```

#### 2.2 Create Cached Storage Methods
Update `server/storage.ts` with caching layer:
```typescript
async getUserCredits(userId: number): Promise<number> {
  const cacheKey = `credits:${userId}`;
  
  // Check memory cache first
  const cached = memCache.get<number>(cacheKey);
  if (cached !== null) return cached;
  
  // Fetch from database
  const [result] = await db
    .select({ balance: userCredits.balance })
    .from(userCredits)
    .where(eq(userCredits.userId, userId));
  
  const balance = result?.balance || 0;
  
  // Cache for 1 minute
  memCache.set(cacheKey, balance, 60);
  
  return balance;
}

async updateUserCredits(userId: number, amount: number, reason: string): Promise<void> {
  // Start transaction
  await db.transaction(async (tx) => {
    // Update credits
    const [updated] = await tx
      .update(userCredits)
      .set({ 
        balance: amount,
        lastUpdated: new Date()
      })
      .where(eq(userCredits.userId, userId))
      .returning();
    
    // Record transaction
    await tx.insert(creditTransactions).values({
      userId,
      amount: amount - (updated.balance || 0),
      type: amount > updated.balance ? 'purchase' : 'deduction',
      reason,
      balanceAfter: amount
    });
  });
  
  // Invalidate cache
  memCache.delete(`credits:${userId}`);
}
```

### Phase 3: Data Migration

#### 3.1 Migration Script
Create `scripts/migrate-kv-to-postgres.ts`:
```typescript
import { kvDatabase } from '../server/lib/kvDatabase';
import { db } from '../server/db';
import { userCredits, subscriptions, gmailTokens } from '@shared/schema';

async function migrateData() {
  console.log('Starting KV to PostgreSQL migration...');
  
  // 1. Migrate Credits
  console.log('Migrating credits...');
  const creditKeys = await kvDatabase.list({ prefix: 'credits:' });
  
  for (const key of creditKeys) {
    const userId = parseInt(key.replace('credits:', ''));
    const creditData = await kvDatabase.get(key);
    
    await db.insert(userCredits).values({
      userId,
      balance: creditData.currentBalance || 0,
      totalPurchased: creditData.totalPurchased || 0,
      totalUsed: creditData.totalUsed || 0
    }).onConflictDoNothing();
  }
  
  // 2. Migrate Subscriptions
  console.log('Migrating subscriptions...');
  const subKeys = await kvDatabase.list({ prefix: 'subscription:' });
  
  for (const key of subKeys) {
    const userId = parseInt(key.replace('subscription:', ''));
    const subData = await kvDatabase.get(key);
    
    await db.insert(subscriptions).values({
      userId,
      stripeCustomerId: subData.stripeCustomerId,
      stripeSubscriptionId: subData.stripeSubscriptionId,
      status: subData.status,
      planType: subData.planType,
      currentPeriodStart: new Date(subData.currentPeriodStart),
      currentPeriodEnd: new Date(subData.currentPeriodEnd)
    }).onConflictDoNothing();
  }
  
  // 3. Migrate Gmail Tokens
  console.log('Migrating Gmail tokens...');
  const tokenKeys = await kvDatabase.list({ prefix: 'gmail:' });
  
  for (const key of tokenKeys) {
    const userId = parseInt(key.replace('gmail:', ''));
    const tokenData = await kvDatabase.get(key);
    
    await db.insert(gmailTokens).values({
      userId,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: new Date(tokenData.expiresAt),
      email: tokenData.email
    }).onConflictDoNothing();
  }
  
  console.log('Migration completed successfully!');
}
```

### Phase 4: Code Updates

#### 4.1 Update CreditService
Modify `server/lib/credits.ts` to use PostgreSQL:
```typescript
export class CreditService {
  static async getUserCredits(userId: number) {
    return await storage.getUserCredits(userId);
  }
  
  static async deductCredits(userId: number, operation: string, success: boolean) {
    const currentBalance = await this.getUserCredits(userId);
    const cost = this.getOperationCost(operation);
    
    if (currentBalance < cost) {
      throw new Error('Insufficient credits');
    }
    
    const newBalance = currentBalance - cost;
    await storage.updateUserCredits(userId, newBalance, operation);
    
    return {
      success: true,
      newBalance,
      transaction: {
        amount: -cost,
        operation,
        timestamp: new Date()
      }
    };
  }
}
```

#### 4.2 Update Frontend Caching
Enhance React Query caching in `client/src/lib/queryClient.ts`:
```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60000, // 1 minute
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2
    }
  }
});

// Credit-specific query with optimistic updates
export const useCreditBalance = () => {
  return useQuery({
    queryKey: ['credits'],
    queryFn: fetchCredits,
    staleTime: 30000, // 30 seconds for credits
    cacheTime: 600000 // 10 minutes
  });
};
```

### Phase 5: Testing & Rollback Plan

#### 5.1 Testing Strategy
1. **Unit Tests**: Test all new PostgreSQL methods
2. **Integration Tests**: Test credit operations, subscriptions
3. **Load Tests**: Verify PostgreSQL handles load
4. **Data Integrity**: Verify all KV data migrated correctly

#### 5.2 Rollback Plan
1. Keep KV Database data for 30 days after migration
2. Implement feature flag to switch between KV and PostgreSQL
3. Create reverse migration script if needed

### Phase 6: Deployment

#### 6.1 Deployment Steps
1. **Backup**: Full backup of both PostgreSQL and KV Database
2. **Schema Deploy**: Run database migrations
3. **Data Migration**: Run migration script during low-traffic period
4. **Code Deploy**: Deploy updated application code
5. **Verification**: Run smoke tests on production
6. **Monitor**: Watch error rates and performance metrics
7. **Cleanup**: After 30 days, remove KV Database code

#### 6.2 Performance Monitoring
- Track PostgreSQL query times
- Monitor cache hit rates
- Watch database connection pool usage
- Alert on credit transaction failures

## Implementation Timeline

- **Week 1**: Database schema and memory cache implementation
- **Week 2**: Update storage methods and services
- **Week 3**: Testing and data migration scripts
- **Week 4**: Staged rollout and monitoring

## Critical Success Factors

1. **Zero Data Loss**: All KV data must be successfully migrated
2. **Performance Maintained**: Response times should not degrade > 20%
3. **No Downtime**: Migration should be seamless to users
4. **Audit Trail**: All credit transactions must be tracked

## Post-Migration Benefits

1. **Simplified Architecture**: Single database to manage
2. **Better Reporting**: Complex analytics queries now possible
3. **Improved Debugging**: All data in one place
4. **Cost Savings**: Eliminate KV Database costs
5. **Future Proof**: PostgreSQL scales better for growth

## Notes for Implementation

- Start with non-critical data (notifications) before migrating credits
- Consider implementing read replicas if read load becomes an issue
- Add database query monitoring (pg_stat_statements)
- Document all new indexes and their purpose
- Keep the memory cache simple - avoid complex invalidation logic

## Conclusion

This migration will significantly improve the maintainability and reliability of the 5Ducks platform while maintaining performance through intelligent caching. The unified data model will enable better analytics, simpler debugging, and more robust transaction handling.