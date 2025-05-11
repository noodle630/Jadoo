import { ReactNode, useState, useEffect } from "react";
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

  // Close sidebar when clicking outside on mobile
  const handleOutsideClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => window.removeEventListener('keydown', handleEscKey);
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Mobile menu button - increased tap target size */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden text-white hover:bg-slate-800/80 rounded-full w-10 h-10 flex items-center justify-center shadow-md animate-pulse"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Close menu" : "Open menu"}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </Button>
      
      {/* Mobile overlay - place BEFORE sidebar to ensure proper z-index stacking */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden cursor-pointer transition-all duration-300"
          onClick={handleOutsideClick}
        />
      )}
      
      {/* Sidebar with higher z-index */}
      <div className="z-40 relative">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Main Content */}
      <div className={`md:pl-64 transition-all duration-300 ${sidebarOpen ? 'pl-0' : 'pl-0'} min-h-screen`}>
        {/* Header bar for mobile with menu button */}
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