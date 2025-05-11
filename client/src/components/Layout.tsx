import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden text-white hover:bg-slate-800"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>
      
      {/* Mobile overlay - place BEFORE sidebar to ensure proper z-index stacking */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - higher z-index than overlay */}
      <div className="z-40 relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main Content */}
      <div className={`md:pl-64 transition-all duration-300 ${sidebarOpen ? 'pl-0' : 'pl-0'} min-h-screen`}>
        {/* Header bar for mobile */}
        <div className="h-14 md:hidden bg-slate-950 border-b border-slate-800 flex items-center px-16">
          <h1 className="text-white font-semibold">S</h1>
        </div>
        
        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}