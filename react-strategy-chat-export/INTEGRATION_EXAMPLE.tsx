// Complete Integration Example for React Strategy Chat Module

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { 
  StrategyOverlayProvider, 
  StrategyOverlay, 
  StrategyDashboard,
  useStrategyOverlay 
} from './index';

// 1. Set up Query Client (required for API calls)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 2. Mock Auth Hook (replace with your auth system)
const useAuth = () => ({
  user: { id: 1, email: 'user@example.com' }, // Replace with real user
  isAuthenticated: true
});

// 3. Mock Toast Hook (replace with your toast system)
const useToast = () => ({
  toast: ({ title, description }: any) => {
    console.log(`Toast: ${title} - ${description}`);
  }
});

// 4. Main App Component
function App() {
  const [overlayState, setOverlayState] = useState<'hidden' | 'minimized' | 'sidebar' | 'fullscreen'>('hidden');

  return (
    <QueryClientProvider client={queryClient}>
      <StrategyOverlayProvider>
        <div className="min-h-screen bg-gray-50">
          {/* Your existing app content */}
          <nav className="bg-white shadow p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Your App</h1>
              <ChatTriggerButton />
            </div>
          </nav>
          
          {/* Strategy Dashboard Page */}
          <main className="container mx-auto py-8">
            <StrategyDashboard />
          </main>
          
          {/* Strategy Chat Overlay */}
          <StrategyOverlay 
            state={overlayState} 
            onStateChange={setOverlayState} 
          />
        </div>
      </StrategyOverlayProvider>
    </QueryClientProvider>
  );
}

// 5. Chat Trigger Component  
function ChatTriggerButton() {
  const { setState } = useStrategyOverlay();
  
  const openChat = () => {
    // Determine if mobile for fullscreen mode
    const isMobile = window.innerWidth < 768;
    setState(isMobile ? 'fullscreen' : 'sidebar');
  };
  
  return (
    <button 
      onClick={openChat}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
    >
      Create Strategy
    </button>
  );
}

// 6. Required Backend APIs
/*
Your backend needs these endpoints:

POST /api/onboarding/strategy-chat
POST /api/strategy/boundary  
POST /api/strategy/boundary/confirm
POST /api/strategy/sprint
POST /api/strategy/queries

Authentication: Bearer token from localStorage.getItem('authToken')

See DATABASE_INTEGRATION.md for database persistence details.
*/

export default App;

// 7. Tailwind CSS Classes Required
/*
Ensure these Tailwind utilities are available:
- Layout: flex, grid, container, mx-auto, etc.
- Spacing: p-*, m-*, gap-*, space-*
- Colors: bg-*, text-*, border-*
- Interactive: hover:*, focus:*, transition-*
- Responsive: sm:*, md:*, lg:*
*/