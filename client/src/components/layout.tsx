import { Footer } from "@/components/ui/footer";
import { EggAnimation } from "@/components/egg-animation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <div className="flex justify-center py-4">
        <EggAnimation />
      </div>
      <Footer />
    </div>
  );
}

export function AuthLayout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        {children}
      </div>
      <div className="flex justify-center py-4">
        <EggAnimation />
      </div>
      <Footer />
    </div>
  );
}