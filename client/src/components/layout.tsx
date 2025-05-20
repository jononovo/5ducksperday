import { Footer } from "@/components/footer";
import { MiniFooter } from "@/components/mini-footer";

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

// App layout with mini footer for app pages
export function AppLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <MiniFooter />
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