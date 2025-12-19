# Generic Credit Operations - Implementation Specification

## Purpose

Create a reusable generic credit deduction system that any feature can use, starting with email search. This eliminates feature-specific billing code and centralizes all credit operations.

---

## Problem Statement

Currently, email search has its own billing logic:
- `client/src/features/search-email/hooks/useEmailSearchBilling.ts` - email-specific credit hook
- `client/src/features/search-email/services/api.ts` - contains `checkCredits()`, `deductCreditsForEmailSearch()`
- Server endpoint `/api/credits/deduct-individual-email` - email-specific endpoint

This pattern doesn't scale. Every new billable feature would need its own billing hooks and endpoints.

---

## Solution

Add generic credit operations to the EXISTING billing system:

1. **Server**: Extend `CreditService` with `deductGeneric()` method
2. **Server**: Add `/api/credits/deduct` endpoint to existing routes
3. **Client**: Create `features/billing/generic-credit/` module with `useCreditOperations` hook
4. **Migration**: Update email search to use the generic hook

---

## Server Implementation

### File: `server/features/billing/credits/service.ts`

Add this method to the existing `CreditService` class:

```typescript
/**
 * Generic credit deduction for any feature
 * @param userId - User to charge
 * @param amount - Credits to deduct
 * @param reason - Feature identifier (e.g., 'email_search', 'ai_generation')
 * @param metadata - Optional context (e.g., { contactId: 123 })
 * @param silent - Suppress console logging
 */
static async deductGeneric(
  userId: number,
  amount: number,
  reason: string,
  metadata?: Record<string, any>,
  silent?: boolean
): Promise<{
  success: boolean;
  charged: boolean;
  newBalance: number;
  isBlocked: boolean;
  message?: string;
}> {
  // Skip for demo user (id=1)
  if (userId === 1) {
    return { success: true, charged: false, newBalance: 999999, isBlocked: false, message: 'Demo user' };
  }

  // Check balance first
  const credits = await this.getUserCredits(userId);
  if (credits.currentBalance < amount) {
    return {
      success: false,
      charged: false,
      newBalance: credits.currentBalance,
      isBlocked: credits.currentBalance < 0,
      message: `Insufficient credits. Balance: ${credits.currentBalance}, Required: ${amount}`
    };
  }

  // Build description from reason + metadata
  const description = this.buildDescription(reason, metadata);
  
  // Deduct using existing storage method
  const result = await storage.updateUserCredits(userId, -amount, 'usage', description);
  
  if (!silent) {
    console.log(`[CreditService] Deducted ${amount} credits from user ${userId} for: ${reason}`);
  }

  return {
    success: true,
    charged: true,
    newBalance: result.balance,
    isBlocked: result.balance < 0
  };
}

private static buildDescription(reason: string, metadata?: Record<string, any>): string {
  const reasonMap: Record<string, string> = {
    'email_search': 'Email search',
    'ai_generation': 'AI content generation',
    'company_search': 'Company search',
    'contact_discovery': 'Contact discovery',
    'individual_search': 'Individual person search',
  };
  const base = reasonMap[reason] || reason.replace(/_/g, ' ');
  if (metadata?.contactId) return `${base} (contact: ${metadata.contactId})`;
  if (metadata?.companyId) return `${base} (company: ${metadata.companyId})`;
  return base;
}
```

### File: `server/features/billing/credits/routes.ts`

Add this endpoint to the existing `registerCreditRoutes` function:

```typescript
// Generic credit deduction endpoint
app.post("/api/credits/deduct", requireAuth, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { amount, reason, metadata, silent } = req.body;

    // Validation
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, charged: false, message: 'Amount must be positive number' });
    }
    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ success: false, charged: false, message: 'Reason is required' });
    }

    const result = await CreditService.deductGeneric(userId, amount, reason, metadata, silent);

    // Return 402 for insufficient credits
    if (!result.success && result.message?.includes('Insufficient')) {
      return res.status(402).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[Credits] Generic deduction error:', error);
    res.status(500).json({
      success: false,
      charged: false,
      message: error instanceof Error ? error.message : 'Deduction failed'
    });
  }
});
```

---

## Client Implementation

### Folder Structure

```
client/src/features/billing/generic-credit/
├── index.ts
├── types.ts
├── services/
│   └── creditApi.ts
└── hooks/
    └── useCreditOperations.ts
```

### File: `types.ts`

```typescript
export interface DeductRequest {
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
  silent?: boolean;
}

export interface DeductResult {
  success: boolean;
  charged: boolean;
  newBalance: number;
  isBlocked: boolean;
  message?: string;
}

export interface CreditBalance {
  balance: number;
  isBlocked: boolean;
}

export const CREDIT_COSTS = {
  EMAIL_SEARCH: 20,
  AI_GENERATION: 10,
  COMPANY_SEARCH: 10,
  CONTACT_DISCOVERY: 60,
  INDIVIDUAL_SEARCH: 180,
} as const;
```

### File: `services/creditApi.ts`

```typescript
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { DeductRequest, DeductResult, CreditBalance } from '../types';

export async function checkCredits(): Promise<CreditBalance> {
  try {
    const response = await apiRequest('GET', '/api/credits');
    return await response.json();
  } catch (error) {
    console.error('[generic-credit] Check failed:', error);
    return { balance: 0, isBlocked: true };
  }
}

export async function deductCredits(request: DeductRequest): Promise<DeductResult> {
  try {
    const response = await apiRequest('POST', '/api/credits/deduct', request);
    const result = await response.json();
    
    // Invalidate credits query to refresh UI
    queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
    
    return result;
  } catch (error) {
    console.error('[generic-credit] Deduction failed:', error);
    return {
      success: false,
      charged: false,
      newBalance: 0,
      isBlocked: false,
      message: error instanceof Error ? error.message : 'Deduction failed'
    };
  }
}
```

### File: `hooks/useCreditOperations.ts`

```typescript
import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { checkCredits, deductCredits } from '../services/creditApi';
import { CREDIT_COSTS, type DeductRequest, type DeductResult } from '../types';

export interface UseCreditOperationsOptions {
  onInsufficientCredits?: (balance: number) => void;
  onDeductionComplete?: (result: DeductResult) => void;
}

export function useCreditOperations(options: UseCreditOperationsOptions = {}) {
  const { toast } = useToast();
  const { onInsufficientCredits, onDeductionComplete } = options;

  const checkSufficientCredits = useCallback(async (requiredAmount: number): Promise<boolean> => {
    const { balance, isBlocked } = await checkCredits();
    
    if (isBlocked || balance < requiredAmount) {
      toast({
        title: 'Insufficient Credits',
        description: `You need ${requiredAmount} credits. Current balance: ${balance}`,
        variant: 'destructive'
      });
      onInsufficientCredits?.(balance);
      return false;
    }
    
    return true;
  }, [toast, onInsufficientCredits]);

  const deduct = useCallback(async (request: DeductRequest): Promise<DeductResult> => {
    const result = await deductCredits(request);
    
    if (!result.success && result.message?.includes('Insufficient')) {
      toast({
        title: 'Insufficient Credits',
        description: result.message,
        variant: 'destructive'
      });
    }
    
    onDeductionComplete?.(result);
    return result;
  }, [toast, onDeductionComplete]);

  return {
    checkSufficientCredits,
    deductCredits: deduct,
    CREDIT_COSTS
  };
}
```

### File: `index.ts`

```typescript
export { useCreditOperations } from './hooks/useCreditOperations';
export { checkCredits, deductCredits } from './services/creditApi';
export { CREDIT_COSTS } from './types';
export type * from './types';
```

---

## Migration: Email Search

### Before (Current)

```typescript
// In useComprehensiveEmailSearch.ts
import { useEmailSearchBilling } from './useEmailSearchBilling';

const { checkSufficientCredits, billForEmailSearch } = useEmailSearchBilling();

// Before search
const hasCredits = await checkSufficientCredits();

// After finding email
await billForEmailSearch(contactId, true);
```

### After (New)

```typescript
// In useComprehensiveEmailSearch.ts
import { useCreditOperations, CREDIT_COSTS } from '@/features/billing/generic-credit';

const { checkSufficientCredits, deductCredits, CREDIT_COSTS } = useCreditOperations();

// Before search
const hasCredits = await checkSufficientCredits(CREDIT_COSTS.EMAIL_SEARCH);

// After finding email
await deductCredits({
  amount: CREDIT_COSTS.EMAIL_SEARCH,
  reason: 'email_search',
  metadata: { contactId }
});
```

---

## Files to Delete After Migration

Once email search is migrated and tested:

1. `client/src/features/search-email/hooks/useEmailSearchBilling.ts`
2. Remove `checkCredits`, `deductCreditsForEmailSearch`, `CREDIT_COST_EMAIL_SEARCH` from `client/src/features/search-email/services/api.ts`

The legacy endpoint `/api/credits/deduct-individual-email` can remain for backwards compatibility or be removed if no other consumers exist.

---

## Step-by-Step Rollout

### Step 1: Server Changes
1. Add `deductGeneric()` method to `server/features/billing/credits/service.ts`
2. Add `buildDescription()` helper method
3. Add `/api/credits/deduct` endpoint to `server/features/billing/credits/routes.ts`
4. Test endpoint with curl/Postman

### Step 2: Client Module
1. Create `client/src/features/billing/generic-credit/` folder structure
2. Create `types.ts` with interfaces and CREDIT_COSTS
3. Create `services/creditApi.ts` with API functions
4. Create `hooks/useCreditOperations.ts` with the hook
5. Create `index.ts` with exports

### Step 3: Migrate Email Search
1. Update `useComprehensiveEmailSearch.ts` to import from `@/features/billing/generic-credit`
2. Replace `useEmailSearchBilling` with `useCreditOperations`
3. Update credit check call to use `checkSufficientCredits(CREDIT_COSTS.EMAIL_SEARCH)`
4. Update billing call to use `deductCredits({ amount, reason, metadata })`
5. Test email search end-to-end

### Step 4: Cleanup
1. Delete `useEmailSearchBilling.ts`
2. Remove unused exports from `search-email/services/api.ts`
3. Update `search-email/index.ts` exports if needed

---

## Testing Checklist

- [ ] `/api/credits/deduct` returns 200 with valid request
- [ ] `/api/credits/deduct` returns 402 when insufficient credits
- [ ] `/api/credits/deduct` returns 400 for invalid amount/reason
- [ ] Demo user (id=1) is not charged
- [ ] Credit balance updates in UI after deduction
- [ ] Email search works: checks credits before, charges after finding email
- [ ] Toast appears when insufficient credits
- [ ] No console errors in browser or server
