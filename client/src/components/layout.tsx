import { useState, useEffect } from "react";
import { Footer } from "@/components/footer";
import { MiniFooter } from "@/components/mini-footer";
import { SavedSearchesDrawer } from "@/components/saved-searches-drawer";
import { useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

// Standard layout with full footer for marketing pages
export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}

// App layout with mini footer for app pages (except /app, /outreach, /streak)
export function AppLayout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [savedSearchesDrawerOpen, setSavedSearchesDrawerOpen] = useState(false);
  
  // Hide MiniFooter on these specific pages
  const hideFooterOnPaths = ['/app', '/outreach', '/streak'];
  const shouldHideFooter = hideFooterOnPaths.includes(location);
  
  // Listen for drawer open events
  useEffect(() => {
    const handleOpenDrawer = () => {
      setSavedSearchesDrawerOpen(true);
    };

    window.addEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    
    return () => {
      window.removeEventListener('openSavedSearchesDrawer', handleOpenDrawer);
    };
  }, []);
  
  // Handle load search action - navigate to /app if needed
  const handleLoadSearch = (list: any) => {
    if (location !== '/app') {
      // Navigate to /app first, then trigger the load
      setLocation('/app');
      // Dispatch event for the home page to handle
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('loadSavedSearch', { detail: list }));
      }, 100);
    } else {
      // Already on /app, dispatch event for home page to handle
      window.dispatchEvent(new CustomEvent('loadSavedSearch', { detail: list }));
    }
    setSavedSearchesDrawerOpen(false);
  };
  
  // Handle new search action - navigate to /app if needed
  const handleNewSearch = () => {
    if (location !== '/app') {
      // Navigate to /app first
      setLocation('/app');
    }
    // Dispatch event for the home page to handle
    window.dispatchEvent(new CustomEvent('startNewSearch'));
    setSavedSearchesDrawerOpen(false);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      {!shouldHideFooter && <MiniFooter />}
      
      {/* Global SavedSearchesDrawer - available on all app pages except /app (which has its own) */}
      {location !== '/app' && (
        <SavedSearchesDrawer 
          open={savedSearchesDrawerOpen}
          onOpenChange={setSavedSearchesDrawerOpen}
          onLoadSearch={handleLoadSearch}
          onNewSearch={handleNewSearch}
        />
      )}
    </div>
  );
}

export function AuthLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <Footer />
    </div>
  );
}