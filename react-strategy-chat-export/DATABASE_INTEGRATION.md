# Database Integration Guide

## Overview
This document provides technical details for implementing database persistence for the React Strategy Chat module.

## Data Flow Analysis

### Current Local Storage Behavior
The chat currently saves data to local storage at these points:
1. **Form completion** - `productService`, `customerFeedback`, `website`
2. **Strategy generation** - AI-generated content as it's created
3. **Chat completion** - Final strategy results

### Database Schema Required

```sql
CREATE TABLE strategic_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(255),
  business_type VARCHAR(20) CHECK (business_type IN ('product', 'service')),
  status VARCHAR(20) CHECK (status IN ('in_progress', 'completed')),
  
  -- Form Data (Step 1-3)
  product_service TEXT,
  customer_feedback TEXT,
  website VARCHAR(500),
  
  -- Generated Strategy Content
  product_analysis_summary TEXT,
  strategy_high_level_boundary TEXT,
  example_sprint_planning_prompt TEXT,
  daily_search_queries JSONB,  -- Array of strings
  report_sales_context_guidance TEXT,
  report_sales_targeting_guidance TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Integration Points

### 1. Form Data Persistence
**Location**: `strategy-overlay.tsx` - `handleContinue()` function  
**When**: After step 3 form completion, before chat starts  
**Data**: `formData` object containing `productService`, `customerFeedback`, `website`

```typescript
// Add to handleContinue() after form validation
const profileData = {
  businessType: businessType,
  productService: formData.productService,
  customerFeedback: formData.customerFeedback,
  website: formData.website,
  status: 'in_progress'
};

const response = await fetch('/api/strategy/profile', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify(profileData)
});
```

### 2. Strategy Content Updates
**Location**: Multiple API response handlers  
**When**: After each AI generation step  
**Data**: Generated content fields

#### Update Points:
1. **Product Analysis** - `/api/onboarding/strategy-chat` response
2. **Boundary Selection** - `/api/strategy/boundary/confirm` response  
3. **Sprint Strategy** - `/api/strategy/sprint` response
4. **Daily Queries** - `/api/strategy/queries` response
5. **Sales Approach** - Final strategy completion

```typescript
// Add to each API response handler
const updateData = {
  profileId: currentProfileId, // Store from initial creation
  [fieldName]: responseData.content
};

await fetch('/api/strategy/profile/update', {
  method: 'PATCH',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify(updateData)
});
```

### 3. Completion Status
**Location**: `completeStrategyWithSalesApproach()` function  
**When**: After final sales approach generation  
**Data**: Status change to 'completed'

```typescript
// Add to completeStrategyWithSalesApproach()
await fetch('/api/strategy/profile/complete', {
  method: 'PATCH',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify({ profileId: currentProfileId })
});
```

## Backend API Endpoints Required

### Create Profile
```
POST /api/strategy/profile
Body: { businessType, productService, customerFeedback, website, status }
Response: { id, ...profileData }
```

### Update Profile
```
PATCH /api/strategy/profile/update
Body: { profileId, [fieldName]: content }
Response: { success: boolean }
```

### Complete Profile
```
PATCH /api/strategy/profile/complete  
Body: { profileId }
Response: { success: boolean }
```

### Get User Profiles
```
GET /api/strategy/profiles
Response: StrategicProfile[]
```

## Implementation Steps

### Phase 1: Basic Persistence
1. Add profile creation after form completion
2. Store `profileId` in component state
3. Add update calls to existing API handlers
4. Test form → database → display flow

### Phase 2: Enhanced Features
1. Add profile editing capabilities
2. Implement export functionality
3. Add profile deletion
4. Implement draft/resume functionality

## Key Implementation Notes

### Authentication
- Use existing `localStorage.getItem('authToken')` pattern
- All API calls already include Bearer token authentication
- No changes needed to auth flow

### Error Handling
- Preserve existing graceful fallbacks
- Database failures should not break chat flow
- Show user-friendly error messages for save failures

### Local Storage Compatibility
- Keep existing local storage for offline capability
- Use database as source of truth when available
- Sync local storage with database on load

### Data Migration
- Existing local storage data can be migrated to database
- No backward compatibility issues
- Progressive enhancement approach

## Estimated Implementation Time
- **Phase 1**: 3-4 hours (basic persistence)
- **Phase 2**: 2-3 hours (enhanced features)
- **Total**: 5-7 hours for complete database integration

## Testing Checklist
- [ ] Profile creation after form completion
- [ ] Strategy content updates during chat
- [ ] Completion status change
- [ ] Profile display in dashboard
- [ ] Error handling for failed saves
- [ ] Authentication token handling
- [ ] Local storage compatibility