# Chat System Modularization Instructions

## Background and Context

The 5Ducks application currently has two parallel chat/onboarding systems that need to be modularized from the main `server/routes.ts` file:

1. **HTML Static Version** - Original implementation served at root `/` route (deprecated but still active)
2. **React Version** - Newer implementation integrated with React SPA

Both systems share the same database tables (`strategic_profiles`) and some endpoints are cross-used between versions, which is intentional and acceptable.

## Current State Analysis

### File Locations

#### HTML Static Version
- **Frontend:** `static/landing.html` (served at `/` route)
- **JavaScript:** `static/js/chat-overlay.js` (vanilla JS implementation)
- **Backend Endpoints in `server/routes.ts`:**
  - `/api/onboarding/chat` (lines 1418-1602, ~185 lines)
  - `/api/onboarding/research` (lines 1605-1669, ~65 lines)

#### React Version
- **Frontend Components:**
  - `client/src/components/chat-overlay.tsx`
  - `client/src/components/strategy-overlay.tsx`
  - `client/src/components/unique-strategy-page.tsx`
- **Backend Endpoints in `server/routes.ts`:**
  - `/api/onboarding/strategy-chat` (lines 1672-2008, ~336 lines)
  - `/api/strategy/boundary` (lines 2010-2038, ~30 lines)
  - `/api/strategy/boundary/confirm` (lines 2039-2113, ~75 lines)
  - `/api/strategy/sprint` (lines 2114-2160, ~50 lines)
  - `/api/strategy/queries` (lines 2161-2219, ~60 lines)
  - `/api/onboarding/process-strategy` (lines 2220-2306, ~86 lines)

#### Strategic Profiles Management (Shared)
- `/api/strategic-profiles/:id` (DELETE, lines 2330-2355)
- `/api/strategic-profiles/save-from-chat` (POST, lines 2385-2426)
- `/api/products` (GET, lines 2360-2378)

**Total lines to extract:** ~900-1000 lines from `server/routes.ts`

### Current Cross-Dependencies
- HTML's `chat-overlay.js` calls both `/api/onboarding/chat` AND `/api/onboarding/strategy-chat`
- React's `chat-overlay.tsx` calls `/api/onboarding/chat` (HTML endpoint)
- React's `strategy-overlay.tsx` calls `/api/onboarding/strategy-chat` (React endpoint)

## Target Module Structure

```
server/
  user-chatbox/
    html-static/         # Legacy HTML version (mark as deprecated)
      types.ts           # Type definitions for HTML version
      service.ts         # Business logic (Perplexity/OpenAI calls)
      routes.ts          # Express routes registration
      index.ts           # Module exports
    react/               # Active React version
      types.ts           # Type definitions for React version
      service.ts         # Business logic (strategy generation)
      routes/
        strategy-chat.ts # Main chat endpoint
        boundary.ts      # Boundary generation
        sprint.ts        # Sprint planning
        queries.ts       # Query generation
        process.ts       # Process strategy
      index.ts           # Module exports
    strategic-profiles/  # Shared profile management
      types.ts
      service.ts
      routes.ts
      index.ts
```

## Implementation Instructions

### Step 1: Create Directory Structure

```bash
mkdir -p server/user-chatbox/html-static
mkdir -p server/user-chatbox/react/routes
mkdir -p server/user-chatbox/strategic-profiles
```

### Step 2: Extract HTML Static Module

#### 2.1 Create `server/user-chatbox/html-static/types.ts`

Extract these types from routes.ts:
- Step flow definitions (lines 1428-1465)
- Profile data interfaces
- Message interfaces

#### 2.2 Create `server/user-chatbox/html-static/service.ts`

Extract and refactor:
- OpenAI query logic (currently inline in routes)
- Perplexity query logic for research
- Profile creation/update logic

#### 2.3 Create `server/user-chatbox/html-static/routes.ts`

Move these endpoints:
```typescript
// From server/routes.ts lines 1418-1602
router.post('/onboarding/chat', async (req, res) => { ... })

// From server/routes.ts lines 1605-1669
router.post('/onboarding/research', async (req, res) => { ... })
```

Add deprecation notice at top:
```typescript
/**
 * @deprecated HTML Static Chat Routes
 * These endpoints support the legacy HTML landing page at '/'
 * New development should use the React version in ../react/
 */
```

### Step 3: Extract React Module

#### 3.1 Create `server/user-chatbox/react/types.ts`

Extract interfaces for:
- `ProductContext`
- `ConversationHistory`
- `BoundaryOption`
- `StrategyResponse`

#### 3.2 Create `server/user-chatbox/react/service.ts`

Extract shared logic:
- OpenAI message construction
- Perplexity research calls
- Strategy generation logic
- Profile ID management

#### 3.3 Create Individual Route Files

Each file should follow this pattern:
```typescript
import { Router } from 'express';
import { requireAuth } from '../../../auth';
import { ServiceClass } from '../service';

export function register[EndpointName]Routes(router: Router) {
  router.post('/[endpoint-path]', async (req, res) => {
    // Endpoint logic here
  });
}
```

Files to create:
- `server/user-chatbox/react/routes/strategy-chat.ts` (lines 1672-2008)
- `server/user-chatbox/react/routes/boundary.ts` (lines 2010-2038)
- `server/user-chatbox/react/routes/sprint.ts` (lines 2114-2160)
- `server/user-chatbox/react/routes/queries.ts` (lines 2161-2219)
- `server/user-chatbox/react/routes/process.ts` (lines 2220-2306)

### Step 4: Extract Strategic Profiles Module

#### 4.1 Create `server/user-chatbox/strategic-profiles/service.ts`

Extract database operations for strategic profiles (currently using `storage` directly).

#### 4.2 Create `server/user-chatbox/strategic-profiles/routes.ts`

Move these endpoints:
- `DELETE /api/strategic-profiles/:id`
- `POST /api/strategic-profiles/save-from-chat`
- `GET /api/products`

### Step 5: Update Main Routes File

In `server/routes.ts`, replace the extracted code with module imports:

```typescript
// Around line 1418, replace all chat endpoints with:
import { registerHtmlStaticChatRoutes } from './user-chatbox/html-static';
import { registerReactChatRoutes } from './user-chatbox/react';
import { registerStrategicProfileRoutes } from './user-chatbox/strategic-profiles';

// In registerRoutes function:
registerHtmlStaticChatRoutes(app);
registerReactChatRoutes(app);
registerStrategicProfileRoutes(app);
```

### Step 6: Handle Shared Dependencies

Both versions use:
- `queryPerplexity()` function (around line 685)
- `storage` for database operations
- `requireAuth` middleware

Options:
1. **Duplicate** these utilities in both modules (recommended for independence)
2. **Create shared utilities** in `server/user-chatbox/shared/`

Recommendation: Duplicate for now to maintain true separation.

## Testing Requirements

After modularization, test:

1. **HTML Landing Page Flow:**
   - Navigate to `/`
   - Click "Product" or "Service" button
   - Complete onboarding chat
   - Verify profile saved to database

2. **React App Flow:**
   - Login to React app
   - Open strategy chat overlay
   - Complete strategy generation
   - Verify all 3 reports generate
   - Check strategic profiles saved

3. **Database Verification:**
   - Confirm both versions save to `strategic_profiles` table
   - Verify no data corruption
   - Check profile retrieval works

## Important Notes

1. **Do NOT delete** `react-strategy-chat-export/` folder yet - wait until testing confirms everything works

2. **Preserve exact functionality** - This is a refactor only, no logic changes

3. **Mark deprecations clearly** - Add comments indicating HTML version is deprecated

4. **Maintain backward compatibility** - Both frontends must continue working without changes

5. **Current line numbers** are approximate and may have shifted - use grep to find exact locations

## Success Criteria

- [ ] Routes.ts reduced from ~2440 lines to ~1500 lines
- [ ] All chat endpoints organized in `server/user-chatbox/`
- [ ] HTML landing page still works at `/`
- [ ] React chat overlay still functions
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] Both chat systems can create strategic profiles

## Common Pitfalls to Avoid

1. **Import paths** - Update all relative imports when moving code
2. **Middleware** - Ensure `requireAuth` is properly imported
3. **Database access** - Maintain `storage` import or inject as dependency
4. **Environment variables** - Keep all API key access intact
5. **CORS/Auth** - Don't break authentication flow

## Final Verification

Run these commands to verify success:
```bash
# Test HTML version
curl -X POST http://localhost:5000/api/onboarding/chat -H "Content-Type: application/json" -d '{"message":"test","businessType":"product"}'

# Test React version  
curl -X POST http://localhost:5000/api/onboarding/strategy-chat -H "Content-Type: application/json" -d '{"userInput":"test","productContext":{}}'

# Check line count reduction
wc -l server/routes.ts  # Should be ~1500 lines
```

This modularization will improve code maintainability while preserving all existing functionality.