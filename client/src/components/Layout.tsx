import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Menu, X, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout, isLoading } = useAuth();
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleLogout = () => {
    logout.mutate();
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
        {/* Header bar for with menu button and user info */}
        <div className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-16">
          <h1 className="text-white font-semibold md:hidden">S</h1>
          <div className="flex-grow"></div>
          {/* User menu */}
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    {user?.profileImageUrl ? (
                      <AvatarImage src={user.profileImageUrl} alt={user.firstName || 'User'} />
                    ) : (
                      <AvatarFallback className="bg-slate-800 text-slate-200">
                        {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-slate-900 border-slate-800 text-slate-200">
                <DropdownMenuLabel>
                  {user?.firstName && user?.lastName ? (
                    <div>{user.firstName} {user.lastName}</div>
                  ) : (
                    <div>{user?.email}</div>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-800" />
                <DropdownMenuItem 
                  className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}