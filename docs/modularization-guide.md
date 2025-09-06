# Modularization Guide for 5Ducks Platform

## Overview
This guide explains the preferred modularization pattern for breaking down monolithic code into self-contained feature modules.

## Folder Structure Pattern

### Location
All feature modules should be placed in:
```
server/features/[feature-name]/
```

### Naming Convention
Use **descriptive, specific names** that clearly indicate the feature's purpose:
- ✅ `email-content-generation/` (specific)
- ✅ `gmail-integration/` (clear purpose)
- ✅ `health-monitoring/` (descriptive)
- ❌ `emails/` (too generic)
- ❌ `integration/` (unclear)
- ❌ `monitoring/` (ambiguous)

## Required Module Files

Each module must contain these 4 files:

### 1. `types.ts`
Define all TypeScript interfaces and types specific to the module:
```typescript
export interface EmailGenerationRequest {
  // Request structure
}

export interface EmailGenerationResponse {
  // Response structure
}
```

### 2. `service.ts`
Contains business logic separated from route handlers:
```typescript
export class EmailGenerationService {
  static async generateEmail(request: EmailGenerationRequest) {
    // Core business logic here
    // Interact with storage, external APIs, etc.
  }
}
```

### 3. `routes.ts`
Express route handlers that use the service layer:
```typescript
export function registerEmailGenerationRoutes(app: Application, requireAuth: any) {
  const router = Router();
  
  router.post('/generate', requireAuth, async (req, res) => {
    const result = await EmailGenerationService.generateEmail(req.body);
    res.json(result);
  });
  
  app.use('/api/email-generation', router);
}
```

### 4. `index.ts`
Module exports for clean imports:
```typescript
export { registerEmailGenerationRoutes } from './routes';
export { EmailGenerationService } from './service';
export * from './types';
```

## Integration Pattern

In `server/routes.ts`, import and register the module:
```typescript
import { registerEmailGenerationRoutes } from "./features/email-content-generation";

// In the registerRoutes function:
registerEmailGenerationRoutes(app, requireAuth);
```

## Key Principles

1. **Self-Contained**: Each module should be independent with minimal cross-dependencies
2. **Authentication**: Accept `requireAuth` middleware as a parameter, don't import directly
3. **Storage Access**: Use the centralized `storage` interface from `server/storage.ts`
4. **Clear Separation**: Keep route handling, business logic, and type definitions separate
5. **Descriptive Naming**: File and folder names should clearly indicate their specific purpose

## Example Modules

Current successfully modularized features:
- `server/features/gmail-integration/` - OAuth and email sending
- `server/features/health-monitoring/` - System diagnostics
- `server/features/lists/` - List CRUD operations
- `server/email-content-generation/` - AI email generation

## Testing After Modularization

Always verify:
1. All endpoints return correct status codes
2. Authentication still works properly
3. Data operations complete successfully
4. No functionality has been broken

## Benefits

- **Maintainability**: Easier to locate and modify specific features
- **Testing**: Each module can be tested independently
- **Scalability**: New features follow the same pattern
- **Code Organization**: Reduces main routes.ts file size significantly