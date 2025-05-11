import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import { MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme-provider";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, setTheme } = useTheme();
  
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="pl-64">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-end border-b border-slate-200 dark:border-slate-800 px-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </Button>
        </header>
        
        {/* Page Content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  );
}