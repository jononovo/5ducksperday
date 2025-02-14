import { Link, useLocation } from "wouter";
import { Bird } from "lucide-react";

const navigation = [
  { name: "Planning", href: "/planning" },
  { name: "Search", href: "/" },
  { name: "Lists", href: "/lists" },
  { name: "Campaigns", href: "/campaigns" },
  { name: "Outreach", href: "/outreach" },
  { name: "Database", href: "/database" }
];

export default function MainNav() {
  const [location] = useLocation();

  return (
    <nav className="flex items-center space-x-4 border-b mb-4 px-4 py-3">
      <div className="flex items-center gap-2 mr-8">
        <Bird className="h-6 w-6 text-primary" />
        <span className="font-semibold text-lg">5 Chicks</span>
      </div>
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
    </nav>
  );
}