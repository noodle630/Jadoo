import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  BarChart3,
  Clock,
  FileSpreadsheet,
  GanttChart,
  Home,
  PlusCircle,
  Settings,
  SlidersHorizontal,
  Globe,
  Radio
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    // Handle both exact matches and sub-routes
    if (path === "/") return location === "/";
    return location === path || location.startsWith(`${path}/`);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-64 flex-col bg-slate-950 text-white">
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-slate-800 px-4">
        <Link href="/">
          <div className="flex items-center gap-2">
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
              <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                isActive("/") 
                  ? "bg-slate-800 text-white" 
                  : "text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}>
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
                <Link href="/feed/new">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/feed/new") 
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                    <PlusCircle size={18} />
                    <span>Create Feed</span>
                  </div>
                </Link>
              </li>
              
              {/* Feed History */}
              <li>
                <Link href="/history">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/history") 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                    <Clock size={18} />
                    <span>Feed History</span>
                  </div>
                </Link>
              </li>
              
              {/* Templates */}
              <li>
                <Link href="/templates">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/templates") 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                    <FileSpreadsheet size={18} />
                    <span>Templates</span>
                  </div>
                </Link>
              </li>
            </ul>
            
            {/* Products Section */}
            <h3 className="mt-6 mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Products
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/products">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/products") && !isActive("/products/categories") && !isActive("/products/import")
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                    <GanttChart size={18} />
                    <span>All Products</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/products/import">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/products/import") 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                    <SlidersHorizontal size={18} />
                    <span>Import Products</span>
                  </div>
                </Link>
              </li>
            </ul>
          </li>
          
          {/* Channel Manager Section */}
          <li className="mt-6">
            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Channel Manager
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/channels">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/channels") 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                    <Globe size={18} />
                    <span>Marketplaces</span>
                  </div>
                </Link>
              </li>
              <li>
                <Link href="/connections">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/connections") 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
                    <Radio size={18} />
                    <span>API Connections</span>
                  </div>
                </Link>
              </li>
            </ul>
          </li>
          
          {/* Analytics Section */}
          <li className="mt-6">
            <h3 className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Analytics
            </h3>
            <ul className="space-y-1">
              <li>
                <Link href="/analytics">
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/analytics") 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
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
                  <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive("/settings") 
                      ? "bg-slate-800 text-white" 
                      : "text-slate-400 hover:bg-slate-900 hover:text-white"
                  }`}>
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
              <p className="text-slate-500">Marketplace feeds</p>
            </div>
          </div>
          <span className="text-xs text-slate-500">© 2025</span>
        </div>
      </div>
    </aside>
  );
}