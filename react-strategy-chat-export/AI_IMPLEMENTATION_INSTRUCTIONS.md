# AI Agent Implementation Instructions - React Strategy Chat

## Task Overview
Integrate the exported React Strategy Chat module into an existing React application. The chat functionality must work exactly as it did in the original system with zero changes to logic or flow.

## Step 1: Copy Core Files

Copy these files to your existing React application structure:

```bash
# Core Components
Copy: react-strategy-chat-export/components/strategy-overlay.tsx
To: client/src/components/strategy-overlay.tsx

Copy: react-strategy-chat-export/components/unique-strategy-page.tsx  
To: client/src/components/unique-strategy-page.tsx

Copy: react-strategy-chat-export/pages/strategy-dashboard.tsx
To: client/src/pages/strategy-dashboard.tsx

# Context Management
Copy: react-strategy-chat-export/contexts/strategy-overlay-context.tsx
To: client/src/lib/strategy-overlay-context.tsx

# Styles
Copy: react-strategy-chat-export/styles/loading-spinner.css
To: client/src/components/ui/loading-spinner.css
```

## Step 2: Add Context Provider to App.tsx

Add the Strategy Overlay Provider to your main App component:

```tsx
// Add to imports
import { StrategyOverlayProvider } from "@/lib/strategy-overlay-context";
import { StrategyOverlay } from "@/components/strategy-overlay";

// Add state for overlay
const [overlayState, setOverlayState] = useState<'hidden' | 'minimized' | 'sidebar' | 'fullscreen'>('hidden');

// Wrap your app content with provider
<StrategyOverlayProvider>
  {/* Your existing app content */}
  <StrategyOverlay state={overlayState} onStateChange={setOverlayState} />
</StrategyOverlayProvider>
```

## Step 3: Add Strategy Dashboard Route

Add the strategy dashboard page to your routing system:

```tsx
// If using wouter (add to your routes)
<Route path="/strategy" component={StrategyDashboard} />

// If using React Router
<Route path="/strategy" element={<StrategyDashboard />} />
```

## Step 4: Create Chat Trigger

Add a button or link that opens the strategy chat:

```tsx
import { useStrategyOverlay } from "@/lib/strategy-overlay-context";

function YourComponent() {
  const { setState } = useStrategyOverlay();
  
  const openChat = () => {
    // Use 'sidebar' for desktop, 'fullscreen' for mobile
    const isMobile = window.innerWidth < 768;
    setState(isMobile ? 'fullscreen' : 'sidebar');
  };
  
  return (
    <button onClick={openChat} className="px-4 py-2 bg-blue-600 text-white rounded">
      Create Strategy
    </button>
  );
}
```

## Step 5: Verify Backend APIs

Ensure these API endpoints exist and work (DO NOT modify them):

```
POST /api/onboarding/strategy-chat      # Main conversation processing
POST /api/strategy/boundary             # Generate boundary options  
POST /api/strategy/boundary/confirm     # Process boundary selection
POST /api/strategy/sprint               # Generate sprint strategies
POST /api/strategy/queries              # Generate daily search queries
```

## Step 6: Check Required Dependencies

Verify these packages exist in package.json (most should already be installed):

```json
{
  "@tanstack/react-query": "^5.x",
  "@radix-ui/react-dialog": "^1.x",
  "@radix-ui/react-tabs": "^1.x", 
  "@radix-ui/react-scroll-area": "^1.x",
  "lucide-react": "latest",
  "wouter": "^3.x" 
}
```

## Step 7: Authentication Integration

The chat uses this authentication pattern - ensure it works with your auth system:

```tsx
// The chat expects this auth token pattern
localStorage.getItem('authToken') // Should return Firebase token

// And this auth hook pattern  
const { user } = useAuth(); // Should return user object or null
```

## Step 8: Test Integration

1. **Test Chat Trigger**: Click your "Create Strategy" button - overlay should open
2. **Test Form Flow**: Fill out 3-step form (Product/Service → Description → Feedback → Website)
3. **Test Chat Interface**: Verify interactive chat with boundary selection buttons
4. **Test Strategy Generation**: Complete full flow and verify results display
5. **Test Local Storage**: Refresh page - data should persist
6. **Test Mobile**: Verify responsive behavior on mobile devices

## Step 9: Verify Functionality Preservation

Confirm these features work exactly as before:

- ✅ 3-step form with product/service selection
- ✅ Interactive chat with AI responses
- ✅ Boundary selection with numbered buttons (1, 2, 3)
- ✅ Custom boundary input field
- ✅ "Use This" confirmation buttons
- ✅ HTML content rendering in messages
- ✅ Progressive strategy generation (Sprint → Queries → Sales Approach)
- ✅ Local storage persistence
- ✅ Mobile responsive overlay modes
- ✅ Results display in strategy dashboard

## Step 10: Troubleshooting

If issues occur:

1. **Import Path Errors**: Verify all `@/` path aliases resolve correctly
2. **Hook Errors**: Ensure useAuth and useToast hooks are available
3. **API Errors**: Check backend endpoints return expected data structure
4. **Style Issues**: Verify Tailwind CSS classes are available
5. **Context Errors**: Ensure StrategyOverlayProvider wraps components using useStrategyOverlay

## Success Criteria

Integration is complete when:
- Chat opens from trigger button
- 3-step form works and progresses to chat
- Interactive boundary selection functions
- Strategy generation completes successfully
- Results display in dashboard
- All functionality matches original system exactly

## Important Notes

- **DO NOT modify any logic** in the copied components
- **DO NOT change API calls** or local storage behavior
- **DO NOT alter the chat flow** or user experience
- **PRESERVE all existing functionality** exactly as-is

The goal is seamless integration with zero functional changes to the chat system.

## Estimated Implementation Time: 2-3 hours