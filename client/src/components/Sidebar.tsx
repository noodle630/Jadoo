import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  PlusCircle, 
  LayoutTemplate, 
  History, 
  Settings,
  Package,
  ChevronDown,
  Grid3X3,
  Upload
} from "lucide-react";
import { useState } from "react";
import Logo from "./Logo";

export default function Sidebar() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState<string[]>(["Products"]);

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
  const NavItem = ({ href, icon, label, children, expandable = false, beta = false }: { 
    href?: string; 
    icon: JSX.Element; 
    label: string;
    children?: React.ReactNode;
    expandable?: boolean;
    beta?: boolean;
  }) => {
    const isActive = href ? isLinkActive(href) : false;
    const isExpanded = expanded.includes(label);
    const activeClass = href === "/" 
      ? isActive && !location.includes("/") ? "bg-blue-600/10 text-blue-500 dark:text-blue-400 font-medium" : "" 
      : isActive ? "bg-blue-600/10 text-blue-500 dark:text-blue-400 font-medium" : "";
    
    const content = (
      <div 
        className={`flex items-center py-2.5 px-3 rounded-md my-0.5 mx-2 hover:bg-slate-800/40 transition-all duration-200 cursor-pointer group ${activeClass}`}
        role="button"
        tabIndex={0}
        onClick={expandable ? () => toggleExpand(label) : undefined}
      >
        <div className="flex items-center flex-1">
          <span className={`mr-3 ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-300'}`}>
            {icon}
          </span>
          <span className={`${isActive ? '' : 'text-slate-300 group-hover:text-slate-100'}`}>{label}</span>
          {beta && (
            <span className="ml-2 text-[10px] font-medium uppercase bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded">Beta</span>
          )}
        </div>
        {expandable && (
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 text-slate-400 group-hover:text-slate-300 ${isExpanded ? 'rotate-180' : ''}`} 
          />
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
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="bg-slate-950 text-white w-full md:w-64 md:min-h-screen flex-shrink-0 border-r border-slate-900/80 shadow-xl flex flex-col">
      <div className="p-4 flex items-center border-b border-slate-900/50">
        <Logo variant="default" size="md" />
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <nav className="py-4">
          <NavItem 
            href="/" 
            icon={<LayoutDashboard className="h-4 w-4" />} 
            label="Dashboard" 
          />
          
          <div className="mt-4 mb-1 px-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Inventory
            </p>
          </div>
          
          <NavItem 
            icon={<Package className="h-4 w-4" />} 
            label="Products"
            expandable
          >
            <div className="py-1 ml-9 border-l border-slate-800 pl-3 mb-2">
              <NavItem
                href="/products" 
                icon={<Grid3X3 className="h-3.5 w-3.5" />} 
                label="All Products" 
              />
              <NavItem 
                href="/products/categories" 
                icon={<LayoutTemplate className="h-3.5 w-3.5" />} 
                label="Categories" 
              />
              <NavItem 
                href="/products/import" 
                icon={<Upload className="h-3.5 w-3.5" />} 
                label="Import" 
              />
            </div>
          </NavItem>
          
          <div className="mt-4 mb-1 px-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Feeds
            </p>
          </div>
          
          <NavItem 
            href="/new-feed" 
            icon={<PlusCircle className="h-4 w-4" />} 
            label="Create Feed" 
          />
          <NavItem 
            href="/templates" 
            icon={<LayoutTemplate className="h-4 w-4" />} 
            label="Templates" 
          />
          <NavItem 
            href="/history" 
            icon={<History className="h-4 w-4" />} 
            label="History" 
          />
          
          <div className="mt-4 mb-1 px-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Settings
            </p>
          </div>
          
          <NavItem 
            href="/settings" 
            icon={<Settings className="h-4 w-4" />} 
            label="Preferences" 
          />
        </nav>
      </div>
      
      <div className="px-4 py-3 text-xs text-slate-500 border-t border-slate-900/50 flex justify-between items-center">
        <span className="font-medium text-slate-400">S</span>
        <span className="text-slate-600">© 2025</span>
      </div>
    </aside>
  );
}
