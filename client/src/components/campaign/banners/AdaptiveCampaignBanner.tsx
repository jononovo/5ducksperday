import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { ActiveCampaignBanner } from './ActiveCampaignBanner';
import { SetupProgressBanner } from './SetupProgressBanner';

interface AdaptiveCampaignBannerProps {
  isActivated: boolean;
  stats?: {
    currentStreak?: number;
    emailsSentToday?: number;
    emailsSentThisMonth?: number;
    companiesContactedThisMonth?: number;
  };
  hasSenderProfile: boolean;
  hasProduct: boolean;
  hasCustomerProfile: boolean;
  enableTestCycle?: boolean; // Optional prop for external control
}

export function AdaptiveCampaignBanner({
  isActivated,
  stats,
  hasSenderProfile,
  hasProduct,
  hasCustomerProfile,
  enableTestCycle
}: AdaptiveCampaignBannerProps) {
  const [testModeIndex, setTestModeIndex] = useState(0);
  
  // Determine if test mode should be enabled
  const isTestModeEnabled = () => {
    // Check for explicit prop
    if (enableTestCycle) return true;
    
    // Check for development mode
    if (import.meta.env.MODE !== 'production') return true;
    
    // Check for URL query parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('testBanners') === '1') return true;
      
      // Check localStorage
      if (localStorage.getItem('bannerTestMode') === '1') return true;
    }
    
    return false;
  };
  
  const testMode = isTestModeEnabled();
  
  // Load saved index from sessionStorage
  useEffect(() => {
    if (testMode && typeof window !== 'undefined') {
      const savedIndex = sessionStorage.getItem('bannerTestIndex');
      if (savedIndex) {
        setTestModeIndex(parseInt(savedIndex, 10));
      }
    }
  }, [testMode]);
  
  // Save index to sessionStorage
  useEffect(() => {
    if (testMode && typeof window !== 'undefined') {
      sessionStorage.setItem('bannerTestIndex', testModeIndex.toString());
    }
  }, [testModeIndex, testMode]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    if (!testMode) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setTestModeIndex(prev => (prev + 1) % 2);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setTestModeIndex(prev => (prev - 1 + 2) % 2);
      } else if (e.key === 'Escape') {
        // Exit test mode
        localStorage.removeItem('bannerTestMode');
        window.location.reload();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [testMode]);
  
  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.shiftKey) {
      // Go backwards
      setTestModeIndex(prev => (prev - 1 + 2) % 2);
    } else {
      // Go forwards
      setTestModeIndex(prev => (prev + 1) % 2);
    }
  };
  
  // Render banner based on test mode or normal logic
  const renderBanner = () => {
    if (testMode) {
      // In test mode, cycle through SetupProgressBanner and ActiveCampaignBanner only
      switch (testModeIndex) {
        case 0:
          return (
            <SetupProgressBanner
              hasSenderProfile={hasSenderProfile}
              hasProduct={hasProduct}
              hasCustomerProfile={hasCustomerProfile}
            />
          );
        case 1:
          return <ActiveCampaignBanner stats={stats || {}} />;
        default:
          return null;
      }
    }
    
    // Normal production logic
    if (isActivated) {
      return <ActiveCampaignBanner stats={stats || {}} />;
    }
    
    return (
      <SetupProgressBanner
        hasSenderProfile={hasSenderProfile}
        hasProduct={hasProduct}
        hasCustomerProfile={hasCustomerProfile}
      />
    );
  };
  
  return (
    <div className="relative">
      {testMode && (
        <div
          className="absolute left-1 top-1 z-10"
          title="Click to cycle banners • Shift+click for previous • Arrow keys to navigate • Esc to exit test mode"
        >
          <ChevronRight
            className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground/70 cursor-pointer select-none"
            size={10}
            onClick={handleChevronClick}
            data-testid="button-cycle-banner"
            aria-label="Cycle through banners (Shift+click for previous)"
          />
        </div>
      )}
      {renderBanner()}
    </div>
  );
}