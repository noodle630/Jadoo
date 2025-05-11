import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Clock,
  FileSpreadsheet,
  Home,
  PlusCircle,
  Settings,
  SlidersHorizontal,
  Globe,
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
            <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-white">
              <span className="text-lg font-semibold">S</span>
            </div>
            <span className="text-xl font-bold">S</span>
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
          
          {/* Feed Management Section */}
          <li className="mt-6">
            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Feeds
            </h3>
            <ul className="space-y-1">
              {/* Create Feed - The main action */}
              <li>
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
              
              {/* Feed History */}
              <li>
                <Link href="/feeds">
                  <div 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive("/feeds") || isActive("/history")
                        ? "bg-slate-800 text-white" 
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Clock size={18} />
                    <span>Feed History</span>
                  </div>
                </Link>
              </li>
              
              {/* Templates */}
              <li>
                <Link href="/templates">
                  <div 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive("/templates") 
                        ? "bg-slate-800 text-white" 
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                    onClick={handleLinkClick}
                  >
                    <FileSpreadsheet size={18} />
                    <span>Templates</span>
                  </div>
                </Link>
              </li>
            </ul>
            
            {/* Products Section */}
            <h3 className="mt-6 mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Channels
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/channels">
                  <div 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive("/channels") 
                        ? "bg-slate-800 text-white" 
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Globe size={18} />
                    <span>Marketplaces</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/products">
                  <div 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive("/products") && !isActive("/products/import")
                        ? "bg-slate-800 text-white" 
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                    onClick={handleLinkClick}
                  >
                    <SlidersHorizontal size={18} />
                    <span>Products</span>
                  </div>
                </Link>
              </li>
            </ul>
          </li>
          
          {/* Analytics Section */}
          <li className="mt-6">
            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Stats
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/analytics">
                  <div 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive("/analytics") 
                        ? "bg-slate-800 text-white" 
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                    onClick={handleLinkClick}
                  >
                    <BarChart3 size={18} />
                    <span>Performance</span>
                  </div>
                </Link>
              </li>
            </ul>
          </li>
          
          {/* Settings Section */}
          <li className="mt-6">
            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Settings
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/settings">
                  <div 
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive("/settings") 
                        ? "bg-slate-800 text-white" 
                        : "text-slate-400 hover:bg-slate-900 hover:text-white"
                    }`}
                    onClick={handleLinkClick}
                  >
                    <Settings size={18} />
                    <span>Preferences</span>
                  </div>
                </Link>
              </li>
            </ul>
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