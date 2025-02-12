import { Link, useLocation } from "wouter";

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
    <nav className="flex space-x-4 border-b mb-6 px-6 py-4">
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
            } px-3 py-2 text-sm font-medium transition-colors`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
