// React Strategy Chat Module - Main Export

// Core Components
export { StrategyOverlay } from './components/strategy-overlay';
export { UniqueStrategyPage } from './components/unique-strategy-page';
export { default as StrategyDashboard } from './pages/strategy-dashboard';

// Context and Hooks
export { 
  StrategyOverlayProvider, 
  useStrategyOverlay 
} from './contexts/strategy-overlay-context';

// Types
export type {
  FormData,
  Message,
  OverlayState,
  BusinessType,
  StrategicProfile,
  StrategyOverlayContextType,
  StrategyOverlayProps,
  UniqueStrategyPageProps,
  StrategyResponse,
  BoundaryResponse
} from './types/strategy.types';

// Usage Example:
/*
import { 
  StrategyOverlayProvider, 
  StrategyOverlay, 
  StrategyDashboard,
  useStrategyOverlay 
} from 'react-strategy-chat';

function App() {
  const [overlayState, setOverlayState] = useState('hidden');
  
  return (
    <StrategyOverlayProvider>
      <StrategyDashboard />
      <StrategyOverlay state={overlayState} onStateChange={setOverlayState} />
    </StrategyOverlayProvider>
  );
}

function TriggerButton() {
  const { setState } = useStrategyOverlay();
  return <button onClick={() => setState('sidebar')}>Open Chat</button>;
}
*/