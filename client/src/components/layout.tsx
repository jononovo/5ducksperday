import { Footer } from "@/components/footer";
import { MiniFooter } from "@/components/mini-footer";
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
  const [location] = useLocation();
  
  // Hide MiniFooter on these specific pages
  const hideFooterOnPaths = ['/app', '/outreach', '/streak'];
  const shouldHideFooter = hideFooterOnPaths.includes(location);
  
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      {!shouldHideFooter && <MiniFooter />}
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