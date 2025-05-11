import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  PlusCircle, 
  LayoutTemplate, 
  History, 
  Settings,
  Database
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const isLinkActive = (path: string) => {
    if (path === "/" && location === path) return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  // Create a NavItem component to avoid the <a> inside <a> nesting issue
  const NavItem = ({ href, icon, label }: { href: string; icon: JSX.Element; label: string }) => {
    const isActive = isLinkActive(href);
    const activeClass = href === "/" 
      ? isActive && !location.includes("/") ? "bg-primary-600" : "" 
      : isActive ? "bg-primary-600" : "";
    
    return (
      <Link href={href}>
        <div 
          className={`flex items-center py-3 px-4 hover:bg-primary-600 transition cursor-pointer ${activeClass}`}
          role="button"
          tabIndex={0}
        >
          {icon}
          <span>{label}</span>
        </div>
      </Link>
    );
  };

  return (
    <aside className="bg-blue-700 text-white w-full md:w-64 md:min-h-screen flex-shrink-0">
      <div className="p-4 flex items-center">
        <Database className="h-6 w-6 mr-2" />
        <span className="text-xl font-semibold">DataFeedSync</span>
      </div>
      <nav className="py-4">
        <NavItem 
          href="/" 
          icon={<LayoutDashboard className="h-5 w-5 mr-3" />} 
          label="Dashboard" 
        />
        <NavItem 
          href="/new-feed" 
          icon={<PlusCircle className="h-5 w-5 mr-3" />} 
          label="New Feed" 
        />
        <NavItem 
          href="/templates" 
          icon={<LayoutTemplate className="h-5 w-5 mr-3" />} 
          label="Templates" 
        />
        <NavItem 
          href="/history" 
          icon={<History className="h-5 w-5 mr-3" />} 
          label="History" 
        />
        <NavItem 
          href="/settings" 
          icon={<Settings className="h-5 w-5 mr-3" />} 
          label="Settings" 
        />
      </nav>
    </aside>
  );
}
