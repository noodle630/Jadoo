import { useState } from "react";
import { useLocation } from "wouter";
import { Bell, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

export default function Header() {
  const [location] = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const getTitle = () => {
    if (location === "/") return "Dashboard";
    if (location.startsWith("/new-feed")) return "Create New Feed";
    if (location.startsWith("/templates")) return "Marketplace Templates";
    if (location.startsWith("/history")) return "Processing History";
    if (location.startsWith("/settings")) return "Account Settings";
    return "DataFeedSync";
  };

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
    staleTime: Infinity
  });

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-gray-800">{getTitle()}</h1>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-64 overflow-y-auto">
                <DropdownMenuItem className="flex flex-col items-start cursor-pointer p-3">
                  <p className="text-sm font-medium">Amazon feed processing complete</p>
                  <p className="text-xs text-muted-foreground mt-1">2 minutes ago</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start cursor-pointer p-3">
                  <p className="text-sm font-medium">Walmart feed validation failed</p>
                  <p className="text-xs text-muted-foreground mt-1">45 minutes ago</p>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex flex-col items-start cursor-pointer p-3">
                  <p className="text-sm font-medium">New template added: TikTok Shop</p>
                  <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center cursor-pointer text-primary p-2">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700 hidden md:block">
                {user?.username || "Loading..."}
              </span>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer">Your Profile</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Account Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
