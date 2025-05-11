import { useLocation } from "wouter";
import { Bell, Menu, User, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

interface HeaderProps {
  onToggleSidebar?: () => void;
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  
  const getPageTitle = () => {
    switch (true) {
      case location === "/":
        return "Dashboard";
      case location === "/new-feed":
        return "Create Feed";
      case location === "/templates":
        return "Templates";
      case location === "/history":
        return "History";
      case location === "/settings":
        return "Preferences";
      case location === "/products":
        return "Products";
      case location === "/products/categories":
        return "Product Categories";
      case location === "/products/import":
        return "Import Products";
      default:
        return "404";
    }
  };
  
  const getPageDescription = () => {
    switch (true) {
      case location === "/":
        return "Overview of your product feeds and performance";
      case location === "/new-feed":
        return "Transform your product data for marketplaces";
      case location === "/templates":
        return "Manage your transformation templates";
      case location === "/history":
        return "Recent feed transformations";
      case location === "/settings":
        return "Customize your experience";
      case location === "/products":
        return "Manage your product inventory";
      case location === "/products/categories":
        return "Organize products by category";
      case location === "/products/import":
        return "Add products to your inventory";
      default:
        return "Page not found";
    }
  };

  return (
    <div className="sticky top-0 z-10">
      <header className="bg-slate-100/50 dark:bg-slate-950/50 backdrop-blur-md py-2 px-4 border-b border-slate-200 dark:border-slate-800/50 flex items-center h-16">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold px-2 dark:text-white">{getPageTitle()}</h1>
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center h-9 rounded-md px-3 mx-4 bg-slate-200/70 dark:bg-slate-800/40 border border-slate-300/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 w-80">
          <Search className="h-4 w-4 mr-2" />
          <span className="text-sm">Search...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1.5 font-mono text-[10px] font-medium text-slate-600 dark:text-slate-400">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        <div className="flex items-center space-x-3">
          <ModeToggle />

          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-medium rounded-full h-4 w-4 flex items-center justify-center">
              2
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 pl-2 pr-3" size="sm">
                <Avatar className="h-7 w-7">
                  <AvatarImage src="https://i.pravatar.cc/150?img=12" />
                  <AvatarFallback>DM</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">demo</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">demo@example.com</p>
                  <p className="text-xs text-muted-foreground">Administrator</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Command className="mr-2 h-4 w-4" />
                <span>API Keys</span>
                <Badge variant="outline" className="ml-auto text-xs py-0">New</Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500 dark:text-red-400">Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="border-b border-slate-200 dark:border-slate-800/50 px-6 py-2.5 bg-white dark:bg-black">
        <p className="text-sm text-slate-500 dark:text-slate-400">{getPageDescription()}</p>
      </div>
    </div>
  );
}