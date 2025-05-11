import { ReactNode, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white dark:bg-black">
      <div 
        className={`md:hidden ${sidebarOpen ? "block" : "hidden"} fixed inset-0 z-40 bg-black bg-opacity-50`} 
        onClick={() => setSidebarOpen(false)} 
      />
      
      <div 
        className={`fixed inset-y-0 left-0 z-50 md:relative md:z-0 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <Sidebar />
      </div>
      
      <div className="flex-grow flex flex-col w-full">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-grow p-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
