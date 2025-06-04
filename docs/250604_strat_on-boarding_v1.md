# Strategic Onboarding Flow Documentation
**Version:** 1.0  
**Date:** 2025-06-04  
**File:** 250604_strat_on-boarding_v1.md

## Overview
The strategic onboarding flow guides users through a 3-phase process that generates progressive AI-powered sales strategies. The system captures product context, refines target markets, and produces sequential strategy reports.

## Architecture Components

### Frontend Components
- **Landing Page** (`static/landing.html`) - Entry point with chat overlay trigger
- **Chat Overlay** (`static/js/chat-overlay.js`) - Main interaction interface
- **Form Modal** - 3-step product information collection

### Backend Components
- **Strategy Chat API** (`/api/onboarding/strategy-chat`) - Orchestrates conversation flow
- **Progressive Strategy APIs** - Three sequential generation endpoints
- **OpenAI Client** (`server/lib/api/openai-client.ts`) - GPT-4o integration
- **Perplexity Client** (`server/lib/api/perplexity-client.ts`) - Real-time market research

## Flow Sequence

### Phase 1: Product Context Collection
**Trigger:** User clicks "Start Chat" on landing page  
**Location:** `chat-overlay.js` lines 438-448

1. **Form Modal Display** - 3-step questionnaire:
   - Product/service description
   - Customer feedback/advantage
   - Website/online presence
2. **Data Validation** - Real-time form validation
3. **Context Storage** - Form data stored in `this.formData`

### Phase 2: Product Analysis Generation
**Trigger:** Form completion  
**API Call:** `POST /api/onboarding/strategy-chat`

```javascript
// Input payload
{
  input: "Generate product summary",
  phase: "PRODUCT_ANALYSIS", 
  productContext: formData
}
```

**Processing Logic:**
1. Perplexity API call for market research
2. Structured product summary generation
3. 4-bullet format output:
   - What it is
   - Problem it solves
   - Competitive advantage
   - Customer benefit

**Response Storage:** Database table `strategicProfiles.productAnalysisSummary`

### Phase 3: Target Market Collection
**Trigger:** Product summary completion  
**Display:** Automated follow-up message

**Prompt Template:**
```
"Perfect! Now please give me an example of a type of business you service or sell you.
Like this "[type of business] in [city/niche]"

Examples:
Popular cafes in Lower East Side, NYC
Real-estate insurance brokers in Salt Lake City"
```

**Validation:** User provides initial target market example

### Phase 4: Target Refinement
**Trigger:** Initial target submission  
**API Call:** `POST /api/onboarding/strategy-chat`

**Processing Logic:**
1. OpenAI GPT-4o analysis of initial target
2. Market refinement suggestions
3. Geographic/demographic optimization
4. Niche specification enhancement

**Output:** Refined target market definition

### Phase 5: Progressive Strategy Generation
**Trigger:** Refined target confirmation  
**Condition:** `currentPhase === 'EMAIL_STRATEGY' && hasRefinedTarget`

**Sequential API Calls:**

#### Step 1: Boundary Generation
**Endpoint:** `POST /api/strategy/boundary`
```javascript
// Payload
{
  initialTarget: string,
  refinedTarget: string,
  productContext: object
}
```
**Function:** `generateBoundary()` in `openai-client.ts`  
**Output:** 90-day strategic boundary (max 10 words)  
**Example:** "Commercial orange juicer manufacturers in Asia and Europe"

#### Step 2: Sprint Strategy
**Endpoint:** `POST /api/strategy/sprint`
```javascript
// Payload
{
  boundary: string,
  refinedTarget: string,
  productContext: object
}
```
**Function:** `generateSprintPrompt()` in `openai-client.ts`  
**Output:** Sprint planning prompt with specific targeting criteria  
**Storage:** `strategicProfiles.exampleSprintPlanningPrompt`

#### Step 3: Daily Queries
**Endpoint:** `POST /api/strategy/queries`
```javascript
// Payload
{
  boundary: string,
  sprintPrompt: string,
  productContext: object
}
```
**Function:** `generateDailyQueries()` in `openai-client.ts`  
**Output:** Array of 8 hyper-specific search queries  
**Storage:** `strategicProfiles.exampleDailySearchQueries`

## Error Handling & Validation

### Frontend Validation
```javascript
// Parameter validation in generateProgressiveStrategy()
if (!initialTarget || !refinedTarget || !productContext.productService) {
  console.error('Missing required parameters');
  return error_message;
}
```

### Backend Validation
```javascript
// API endpoint validation
if (!initialTarget || !refinedTarget || !productContext) {
  res.status(400).json({ message: "Missing required parameters" });
  return;
}
```

### Error Recovery
- Comprehensive logging at each step
- Graceful degradation with user feedback
- Retry mechanisms for API failures

## UI/UX Flow

### Progressive Display
1. **Loading States** - Real-time progress indicators
2. **Step-by-Step Reveal** - Individual strategy components displayed sequentially
3. **Complete Summary** - Final consolidated view titled "90-Day Target Search Strategy"
4. **Completion Message** - Clickable link to main application

### Message Types
- **Loading Messages** - `isLoading: true, isHTML: true`
- **Strategy Steps** - Individual component displays
- **HTML Messages** - `isHTML: true` for formatted content
- **Completion Link** - `target="_blank"` with styling

## Database Schema

### Strategic Profiles Table
```sql
strategicProfiles {
  userId: number,
  productAnalysisSummary: text,
  exampleSprintPlanningPrompt: text,
  exampleDailySearchQueries: text[]
}
```

## API Integration

### OpenAI GPT-4o
- **Model:** `gpt-4o` (latest available)
- **Purpose:** Strategy generation, market analysis
- **Response Format:** JSON structured outputs

### Perplexity API
- **Model:** `sonar`
- **Purpose:** Real-time market research, competitive analysis
- **Features:** Live web search integration

## Technical Implementation Details

### Context Preservation
```javascript
// Proper parameter passing to avoid corruption
const productContext = {
  productService: this.formData?.productService,
  customerFeedback: this.formData?.customerFeedback,
  website: this.formData?.website
};
```

### Sequential Processing
```javascript
// Ensures proper data flow between steps
strategyData.boundary = boundaryData.content;
// Use boundary in next step
{ boundary: strategyData.boundary, refinedTarget, productContext }
```

### Completion Flow
```javascript
// Final message with clickable link
setTimeout(() => {
  const currentDomain = window.location.origin;
  content: `Awesome! We're done here.<br><br>Now go to <a href="${currentDomain}/app" target="_blank">app</a>`
}, 1000);
```

## Performance Considerations
- **API Response Times:** 2-5 seconds per strategy step
- **Total Flow Duration:** 15-30 seconds for complete generation
- **Error Recovery:** Automatic retry with user notification
- **Memory Management:** Efficient message array handling

## Security & Authentication
- **API Key Management:** Environment variable storage
- **User Context:** Firebase authentication integration
- **Data Persistence:** Authenticated user strategy storage
- **Cross-Origin:** Proper CORS configuration

---
**End of Documentation**