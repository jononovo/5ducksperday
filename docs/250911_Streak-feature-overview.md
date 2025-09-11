
# Streak Page & Campaign Management System - Technical Documentation

## Overview

The Streak page is the central hub for managing B2B outreach campaigns in the 5Ducks application. It orchestrates daily lead generation, tracks user engagement through a streak system, and provides comprehensive campaign configuration through a modular 4-component setup.

## Architecture

### Frontend Stack

- React/TypeScript page component (`client/src/pages/Streak.tsx`)
- TanStack Query v5 for data fetching and caching
- shadcn/ui components for consistent UI
- date-fns for date operations and formatting
- Wouter for client-side routing

### Backend Modules

```
server/features/
├── campaigns/
│   ├── sender-profiles/
│   ├── customer-profiles/
│   └── products/ (strategic profiles)
└── daily-outreach/
    └── services/batch-generator.ts
```

## Campaign Management System

### 4-Component Setup Architecture

#### 1. Me (Sender Profile)

- Represents the user's professional identity
- Fields: email, display name, first/last name, title, company, city, website
- Toggle selection: Click to select/deselect profiles
- API: `POST/GET/PUT/DELETE /api/sender-profiles`

#### 2. My Product (Strategic Profile)

- Defines what the user is selling
- Quick setup via ProductOnboardingForm (4-step wizard)
- Shared with Strategy Chat feature for consistency
- API: `POST /api/strategic-profiles/quick-setup`

#### 3. Ideal Customer (Customer Profile)

- Target audience definition
- Fields: example company, search prompt, additional context
- Industry and company size extraction from search prompts
- API: `POST/GET/PUT/DELETE /api/customer-profiles`

#### 4. Play Button (Campaign Activation)

- Toggles campaign active/inactive state
- Shows 3 progress indicators (checkmarks for each component)
- Enables/disables daily outreach preferences
- Visual states: inactive (play icon) vs active (pause option)

### Selection Toggle Behavior

```javascript
const handleProfileChange = (profileId: number) => {
  // Toggle selection - if already selected, deselect it
  if (selectedProfileId === profileId) {
    setSelectedProfileId(null);
    setActiveProfile.mutate(0);
  } else {
    setSelectedProfileId(profileId);
    setActiveProfile.mutate(profileId);
  }
};
```

## Daily Outreach System

### Batch Generation Process

1. **Contact Selection**: Finds 5 high-confidence contacts from available pool
2. **Data Enrichment**: Joins company data with contact information
3. **Email Generation**: Creates personalized emails via AI service
4. **Persistence**: Stores in `dailyOutreachBatches` and `dailyOutreachItems` tables
5. **Delivery**: SendGrid integration for email sending

### Email Generation Pipeline

- Service: `server/email-content-generation/service.generateEmailContent`
- Combines sender profile + product info + customer context
- 42 unique combinations (7 tones × 6 offer strategies)
- Preserves paragraph spacing from AI responses

## Streak Tracking & Statistics

### Metrics Tracked

```typescript
interface StreakStats {
  currentStreak: number;           // Consecutive days
  longestStreak: number;          // Historical best
  weeklyGoal: number;             // Target days/week
  weeklyProgress: number;         // Current week progress
  availableCompanies: number;     // Pipeline inventory
  availableContacts: number;      // Ready to contact
  emailsSentToday: number;        // Daily count
  emailsSentThisWeek: number;     // Weekly aggregate
  emailsSentThisMonth: number;    // Monthly aggregate
  companiesContactedAllTime: number; // Total reach
}
```

### Progress Visualization

- Weekly goal progress bar with color coding
- Streak emoji indicators (🔥 for 7+ days, ✨ for 3+ days)
- Real-time stats refresh (30-second intervals)

## Adaptive Banner System

### Intro Banner (Campaign Inactive)

- Simplified design matching metrics banner dimensions
- Shows setup progress (0/3 to 3/3 components)
- Displays component status inline (✓ Profile Set, etc.)
- Progress bar visualization

### Metrics Banner (Campaign Active)

- Live campaign statistics
- Leads generated count with daily delta
- Response rate with trend indicator
- Campaign timeline (Day X of 14)
- Visual progress bar

## Data Flow & State Management

### Query Keys Architecture

```javascript
// Array-based keys for proper cache invalidation
queryKey: ['/api/sender-profiles']
queryKey: ['/api/products']
queryKey: ['/api/customer-profiles']
queryKey: ['/api/daily-outreach/preferences']
queryKey: ['/api/daily-outreach/streak-stats']
```

### Mutation Flow

1. User interaction triggers handler
2. Local state updates immediately (optimistic)
3. API mutation executes
4. Success: Cache invalidation + toast notification
5. Error: Rollback + error toast

### Preference Synchronization

```typescript
// Preferences stored and synced
interface OutreachPreferences {
  enabled: boolean;
  scheduleDays?: string[];
  scheduleTime?: string;
  activeProductId?: number;
  activeSenderProfileId?: number;
  activeCustomerProfileId?: number;
}
```

## Form Components

### ProductOnboardingForm

- 4-step wizard: Business type → Description → Customer feedback → Website
- Auto-activates campaign on completion
- Creates strategic profile for cross-feature use

### CustomerProfileForm

- 3-step process with guided prompts
- Smart field extraction (industry from search prompt)
- Optional context for timing/seasonality

### SenderProfileForm

- Flexible 3-page form (only page 1 required)
- Quick save option after essential fields
- Progressive detail collection

## API Security & Validation

### Authentication & Ownership

- All routes check `getUserId(req)` for authentication
- User ownership validated before CRUD operations
- Demo user (ID: 1) has pre-seeded sample data

### Input Validation

- Zod schemas for request body validation
- Insert schemas from drizzle-zod
- Type-safe API contracts

### Rate Limiting

- Session-based limits for demo users (10 searches/hour)
- Prevents API abuse while maintaining UX

## Key User Workflows

### New User Onboarding

1. Land on Streak page → See intro banner with Fluffy
2. Click "+" to add product → Complete 4-step wizard
3. Add sender profile (minimal: email + display name)
4. Define ideal customer (example + search prompt)
5. Press Play button → Campaign activates
6. Banner switches to metrics view
7. Daily batches generate automatically

### Daily Operations

1. Review today's prospects in quick actions card
2. Click "Review & Send" to open email preview
3. Track progress via streak counter
4. Monitor pipeline health (available contacts)
5. Adjust schedule via slider (1-7 days/week)

## Recent Improvements

### Modularization (Sep 2025)

- Campaigns extracted to `server/features/campaigns/`
- 34% reduction in main routes.ts file (3521 → 2313 lines)
- Feature-based folder structure with self-contained modules
- Symmetric frontend-backend module pattern

### UI/UX Enhancements

- Simplified intro banner (removed over-engineering)
- Progress indicators moved to component boxes
- Toggle selection behavior for all components
- Visual checkmark badges on selected items
- Responsive design with mobile optimization

## Integration Points

### External APIs

- **Perplexity API**: Company research
- **OpenAI API**: Email content generation
- **Hunter.io/Apollo**: Email verification
- **SendGrid**: Email delivery
- **Firebase**: Authentication

### Database Schema

```sql
-- Core campaign tables
strategic_profiles (products)
sender_profiles
customer_profiles
daily_outreach_preferences

-- Batch tracking
daily_outreach_batches
daily_outreach_items
```

## Testing Considerations

### AI Test Mode

- `ENABLE_AI_TEST_MODE=true` bypasses authentication
- Demo user (`demo@5ducks.ai`) with pre-seeded data
- Automated browser testing via Playwright
- Rate limits apply to prevent abuse

### Recommended Test Coverage

1. Component selection/deselection toggle
2. Banner state transitions
3. Form validation and submission
4. Preference synchronization
5. Batch generation pipeline
6. Email content generation
7. Streak calculation logic

## Future Enhancements

### Immediate Priorities

1. Support null values in backend for deselection
2. Add explicit PATCH endpoints for clearing selections
3. Integration tests for toggle behavior

### Roadmap Considerations

1. OpenAPI documentation for REST endpoints
2. Typed client generation from API specs
3. Real-time collaboration features
4. Advanced analytics dashboard
5. A/B testing for email strategies
