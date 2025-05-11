import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  PlusCircle, 
  LayoutTemplate, 
  History, 
  Settings,
  Database,
  Package,
  ChevronDown
} from "lucide-react";
import { useState } from "react";

export default function Sidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState<string[]>([]);

  const isLinkActive = (path: string) => {
    if (path === "/" && location === path) return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const toggleExpand = (section: string) => {
    if (expanded.includes(section)) {
      setExpanded(expanded.filter(item => item !== section));
    } else {
      setExpanded([...expanded, section]);
    }
  };

  // Create a NavItem component to avoid the <a> inside <a> nesting issue
  const NavItem = ({ href, icon, label, children, expandable = false }: { 
    href?: string; 
    icon: JSX.Element; 
    label: string;
    children?: React.ReactNode;
    expandable?: boolean;
  }) => {
    const isActive = href ? isLinkActive(href) : false;
    const isExpanded = expanded.includes(label);
    const activeClass = href === "/" 
      ? isActive && !location.includes("/") ? "bg-slate-800" : "" 
      : isActive ? "bg-slate-800" : "";
    
    const content = (
      <div 
        className={`flex items-center py-3 px-4 hover:bg-slate-800 transition cursor-pointer ${activeClass}`}
        role="button"
        tabIndex={0}
        onClick={expandable ? () => toggleExpand(label) : undefined}
      >
        <div className="flex items-center flex-1">
          {icon}
          <span>{label}</span>
        </div>
        {expandable && (
          <ChevronDown size={16} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        )}
      </div>
    );
    
    return (
      <div>
        {href ? (
          <Link href={href}>
            {content}
          </Link>
        ) : (
          content
        )}
        {children && (
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40' : 'max-h-0'}`}>
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="bg-slate-900 text-white w-full md:w-64 md:min-h-screen flex-shrink-0 border-r border-slate-800 shadow-xl">
      <div className="p-4 flex items-center border-b border-slate-800">
        <Database className="h-6 w-6 mr-2 text-blue-400" />
        <span className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">DataFeedSync</span>
      </div>
      <nav className="py-2">
        <NavItem 
          href="/" 
          icon={<LayoutDashboard className="h-5 w-5 mr-3 text-slate-400" />} 
          label="Dashboard" 
        />
        
        <NavItem 
          icon={<Package className="h-5 w-5 mr-3 text-slate-400" />} 
          label="Products"
          expandable
        >
          <div className="bg-slate-950 px-4 py-1">
            <NavItem
              href="/products" 
              icon={<div className="w-2 h-2 rounded-full bg-slate-500 mr-3"></div>} 
              label="All Products" 
            />
            <NavItem 
              href="/products/categories" 
              icon={<div className="w-2 h-2 rounded-full bg-slate-500 mr-3"></div>} 
              label="Categories" 
            />
            <NavItem 
              href="/products/import" 
              icon={<div className="w-2 h-2 rounded-full bg-slate-500 mr-3"></div>} 
              label="Import" 
            />
          </div>
        </NavItem>
        
        <NavItem 
          href="/new-feed" 
          icon={<PlusCircle className="h-5 w-5 mr-3 text-slate-400" />} 
          label="New Feed" 
        />
        <NavItem 
          href="/templates" 
          icon={<LayoutTemplate className="h-5 w-5 mr-3 text-slate-400" />} 
          label="Templates" 
        />
        <NavItem 
          href="/history" 
          icon={<History className="h-5 w-5 mr-3 text-slate-400" />} 
          label="History" 
        />
        <NavItem 
          href="/settings" 
          icon={<Settings className="h-5 w-5 mr-3 text-slate-400" />} 
          label="Settings" 
        />
      </nav>
      
      <div className="absolute bottom-0 w-full px-4 py-2 text-xs text-slate-500 bg-slate-950 border-t border-slate-800">
        <div className="flex justify-between items-center">
          <span>V1.0.0</span>
          <span>© 2025</span>
        </div>
      </div>
    </aside>
  );
}
