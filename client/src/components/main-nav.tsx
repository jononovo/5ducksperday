import { Link, useLocation } from "wouter";
import { Bird, LogOut, User, Menu, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigation = [
  { name: "Search", href: "/" },
  { name: "Lists", href: "/lists" },
  { name: "Campaigns", href: "/campaigns" },
  { name: "Outreach", href: "/outreach" }
];

export function MainNav() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b mb-4 px-4 py-3">
      <div className="flex items-center space-x-4">
        <Link href="/" className="group flex items-center gap-2 mr-8">
          <Bird className="h-7 w-7 text-primary transition-colors group-hover:text-primary/90" 
                style={{ transform: 'scaleX(-1)' }} /> {/* Flip the bird to face right */}
          <span className="font-semibold text-lg transition-colors group-hover:text-primary/90">5 Ducks</span>
        </Link>
        {navigation.map((item) => {
          const isActive = item.href === location || 
            (item.href === "/" && location === "/");

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                isActive
                  ? "text-primary font-semibold border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              } px-2 py-1.5 text-sm font-medium transition-colors`}
            >
              {item.name}
            </Link>
          );
        })}
      </div>
      {user && (
        <div className="flex items-center ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />
                <span>Logout</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <Link href="/build">
                <DropdownMenuItem>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  <span>Build</span>
                </DropdownMenuItem>
              </Link>
              <Link href="/account">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  <span>Account</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </nav>
  );
}