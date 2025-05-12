import { Link, useLocation } from "wouter";
import {
  Home,
  PlusCircle,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    // Handle both exact matches and sub-routes
    if (path === "/") return location === "/";
    return location === path || location.startsWith(`${path}/`);
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <aside 
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-950 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 shadow-2xl shadow-slate-900/50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      aria-hidden={!isOpen && window.innerWidth < 768}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <Link href="/">
          <div className="flex items-center gap-2" onClick={handleLinkClick}>
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-800/20">
              <span className="text-lg font-bold">S</span>
            </div>
            <div className="flex flex-col -mt-0.5">
              <span className="text-xl font-black bg-gradient-to-r from-blue-500 to-indigo-400 text-transparent bg-clip-text">S</span>
              <span className="text-[9px] text-slate-400 -mt-1">PRODUCT FEEDS</span>
            </div>
          </div>
        </Link>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1 px-2">
          {/* Dashboard */}
          <li>
            <Link href="/">
              <div 
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive("/") 
                    ? "bg-slate-800 text-white" 
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                onClick={handleLinkClick}
              >
                <Home size={18} />
                <span>Dashboard</span>
              </div>
            </Link>
          </li>
          
          {/* Create Feed - The main action */}
          <li className="mt-6">
            <Link href="/create-feed">
              <div 
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive("/create-feed") 
                    ? "bg-blue-600 text-white" 
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
                onClick={handleLinkClick}
              >
                <PlusCircle size={18} />
                <span>Create Feed</span>
              </div>
            </Link>
          </li>
        </ul>
      </nav>
      
      {/* Footer */}
      <div className="mt-auto border-t border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-medium">
              S
            </div>
            <div className="text-xs">
              <p className="font-medium text-slate-300">S</p>
              <p className="text-slate-500">© 2025</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}