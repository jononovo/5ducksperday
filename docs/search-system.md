# Search System Documentation

## UI to Backend Connection for Search Prompts

### Key Components

1. **Frontend Components**
   - `search-approaches.tsx`: Main component for managing search approaches
   - `search-flow-new.tsx`: Newer version of the search flow UI
   - Located in: `client/src/components/`

2. **Backend Storage**
   - `server/storage/search.ts`: Handles database operations for search approaches
   - Uses Drizzle ORM for database interactions

### Prompt Update Flow

1. User clicks "Edit Approach" in UI
   - Managed by `ApproachEditor` component in `search-approaches.tsx`
   - Shows form with fields for:
     - User-facing prompt
     - Technical prompt
     - Response structure

2. Updates are sent to backend
   - Uses `apiRequest` from `@/lib/queryClient`
   - Endpoint: `PATCH /api/search-approaches/:id`
   - Handled by `updateSearchApproach` in `server/storage/search.ts`

## Search Structure

### Module Organization

1. **Search Logic (`server/lib/search-logic/`)**
   - `deep-searches/`: Contains specialized search implementations
   - `email-discovery/`: Email-specific search logic
   - `shared/`: Common utilities and types

2. **Search Modules**
   - Company Overview
   - Email Discovery
   - Decision Maker Analysis

### File Interactions

```
[Frontend]
search-approaches.tsx
         ↓
    API Request
         ↓
[Backend Routes]
routes.ts → storage/search.ts
         ↓
[Search Logic]
lib/search-logic/ → specific module implementation
```

### Key Files and Their Roles

1. **Frontend**
   - `client/src/lib/search-sections.ts`
     - Defines search subsections and configurations
     - Used by UI components to render search options

2. **Backend**
   - `server/lib/search-logic/email-discovery/service.ts`
     - Implements email discovery logic
     - Manages multiple search strategies

3. **Types and Schemas**
   - `shared/schema.ts`
     - Defines common types used across frontend and backend
     - Contains Drizzle schema definitions

## Prompt Management

### Database Structure

- Prompts are stored in the `search_approaches` table
- Fields include:
  - `prompt`: User-facing instructions
  - `technical_prompt`: Implementation details
  - `response_structure`: Expected JSON format

### Updating Prompts

1. **Via UI**
   ```typescript
   // search-approaches.tsx
   const updateMutation = useMutation({
     mutationFn: async ({ id, updates }) => {
       const response = await apiRequest(
         "PATCH",
         `/api/search-approaches/${id}`,
         updates
       );
       return response.json();
     }
   });
   ```

2. **Via Database**
   ```sql
   UPDATE search_approaches 
   SET prompt = 'new prompt',
       technical_prompt = 'new technical prompt'
   WHERE id = specific_id;
   ```

## Search Implementation Details

### Email Discovery Module

1. **Components**
   - Website crawler
   - Pattern prediction
   - Domain analysis
   - Public directory search
   - Social profile search

2. **Configuration**
   - Located in `server/lib/search-logic/email-discovery/index.ts`
   - Defines available search strategies
   - Configures validation rules

### Integration Points

1. **Frontend to Backend**
   - React Query for data fetching
   - Mutation hooks for updates
   - Real-time UI updates via cache invalidation

2. **Backend to Search Logic**
   - Service layer abstraction
   - Strategy pattern for different search types
   - Validation pipeline

## Best Practices

1. **Updating Prompts**
   - Always update through the UI when possible
   - Use SQL updates only for bulk changes or fixes
   - Maintain consistency between user and technical prompts

2. **Adding New Search Types**
   - Add implementation in `server/lib/search-logic/`
   - Update types in `shared/schema.ts`
   - Add UI components in `client/src/components/`
   - Register in `search-sections.ts`

3. **Error Handling**
   - Frontend: React Query error boundaries
   - Backend: Try-catch blocks with proper error responses
   - Search Logic: Strategy-specific error handling
