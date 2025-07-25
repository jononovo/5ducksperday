# React Strategy Chat Export

## Overview
This is the complete React strategy chat functionality exported from 5Ducks. The chat works exactly as-is with all current logic, flow, and local storage behavior preserved.

## Core Components

### Main Components
- `components/strategy-overlay.tsx` - Main interactive chat interface
- `contexts/strategy-overlay-context.tsx` - State management for overlay visibility
- `pages/strategy-dashboard.tsx` - Results display and "Create Strategy" trigger
- `components/unique-strategy-page.tsx` - Individual strategy view modal

### Supporting Files
- `styles/loading-spinner.css` - Loading animation styles

## Quick Integration

### 1. Install Dependencies
```bash
npm install @tanstack/react-query @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-scroll-area lucide-react wouter tailwindcss
```

### 2. Context Provider Setup
```tsx
import { StrategyOverlayProvider } from './contexts/strategy-overlay-context';
import { StrategyOverlay } from './components/strategy-overlay';

function App() {
  const [overlayState, setOverlayState] = useState('hidden');
  
  return (
    <StrategyOverlayProvider>
      <YourApp />
      <StrategyOverlay state={overlayState} onStateChange={setOverlayState} />
    </StrategyOverlayProvider>
  );
}
```

### 3. Trigger Chat
```tsx
import { useStrategyOverlay } from './contexts/strategy-overlay-context';

function YourComponent() {
  const { setState } = useStrategyOverlay();
  
  const openChat = () => {
    setState('sidebar'); // Opens chat in sidebar mode
    // Use 'fullscreen' for mobile
  };
  
  return <button onClick={openChat}>Create Strategy</button>;
}
```

## Required Backend APIs

The chat expects these endpoints to be available:

```
POST /api/onboarding/strategy-chat      # Main conversation processing
POST /api/strategy/boundary             # Generate boundary options  
POST /api/strategy/boundary/confirm     # Process boundary selection
POST /api/strategy/sprint               # Generate sprint strategies
POST /api/strategy/queries              # Generate daily search queries
```

## Authentication
- Uses `localStorage.getItem('authToken')` for Bearer token authentication
- Falls back gracefully if no auth token is present

## Local Storage Usage
The chat automatically handles:
- Form data persistence across steps
- Message history storage
- Strategy results caching
- Chat state preservation

## Data Structure (For Future Database Integration)

The chat generates this data structure:

```typescript
interface StrategicProfile {
  // Form Data (Steps 1-3)
  productService: string;           # User's product/service description
  customerFeedback: string;         # What customers like
  website: string;                  # Website/online presence
  
  // Generated Content
  productAnalysisSummary: string;           # AI product analysis
  strategyHighLevelBoundary: string;       # Selected boundary
  exampleSprintPlanningPrompt: string;     # Sprint strategy
  dailySearchQueries: string[];            # Search queries array
  reportSalesContextGuidance: string;      # Marketing context
  reportSalesTargetingGuidance: string;    # Sales targeting
  
  // Metadata
  businessType: "product" | "service";     # Business type
  status: "completed" | "in_progress";     # Completion status
  createdAt: Date;                 # Creation timestamp
}
```

## Chat Flow
1. **Business Type Selection** - Product or Service
2. **3-Step Form** - Product description, customer feedback, website
3. **AI Conversation** - Interactive chat with boundary selection
4. **Strategy Generation** - Sprint planning, daily queries, sales approach
5. **Results Display** - Complete strategy with marketing context

## Integration Time: 2-3 hours

The system is production-ready and preserves all existing functionality exactly as-is.