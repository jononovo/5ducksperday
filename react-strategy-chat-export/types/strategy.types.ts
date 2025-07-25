// Type definitions for React Strategy Chat Module

export interface FormData {
  productService: string;
  customerFeedback: string;
  website: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isHTML?: boolean;
  isLoading?: boolean;
}

export type OverlayState = 'hidden' | 'minimized' | 'sidebar' | 'fullscreen';
export type BusinessType = 'product' | 'service';

export interface StrategicProfile {
  id: number;
  name: string;
  businessType: string;
  status: string;
  productService: string;
  customerFeedback: string;
  website: string;
  createdAt: string;
  productAnalysisSummary?: string;
  strategyHighLevelBoundary?: string;
  exampleSprintPlanningPrompt?: string;
  dailySearchQueries?: string;
  reportSalesContextGuidance?: string;
  reportSalesTargetingGuidance?: string;
}

export interface StrategyOverlayContextType {
  state: OverlayState;
  showOverlay: (state: OverlayState) => void;
  hideOverlay: () => void;
  setState: (state: OverlayState) => void;
}

export interface StrategyOverlayProps {
  state: OverlayState;
  onStateChange: (state: OverlayState) => void;
}

export interface UniqueStrategyPageProps {
  product: StrategicProfile;
  onClose: () => void;
}

// API Response Types
export interface StrategyResponse {
  type: string;  
  message?: string;
  content?: any;
  productContext?: any;
  nextStep?: string;
  completed?: boolean;
  profileUpdate?: any;
}

export interface BoundaryResponse {
  description: string;
  content: string[];
  productContext: any;
}