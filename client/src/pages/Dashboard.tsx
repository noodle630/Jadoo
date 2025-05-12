import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FeedHistory from "@/components/FeedHistory";
import { PlusCircle, BarChart3, Zap, TrendingUp, FileSpreadsheet, FileUp, ArrowUpRight } from "lucide-react";

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Placeholder for stats - in a real app these would come from API
  const stats = {
    totalFeeds: 5,
    totalProducts: 437,
    fixedIssues: 27,
    activeMarketplaces: 3
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-white bg-clip-text text-transparent">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor your marketplace feeds
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/simple-transform">
            <Button variant="outline" className="border-slate-300 dark:border-slate-700">
              <FileUp className="h-4 w-4 mr-2" />
              Direct Transform
            </Button>
          </Link>
          <Link href="/feed/new">
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Feed
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Feeds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalFeeds}</div>
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <FileSpreadsheet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fixed Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.fixedIssues}</div>
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Marketplaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{stats.activeMarketplaces}</div>
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Feed History */}
      <FeedHistory />
      
      {/* Recent Activity & Performance Tabs */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-xl font-bold">Analytics & Activity</CardTitle>
          <CardDescription>Performance insights and recent activity</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 grid grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity Log</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-6 text-center">
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Welcome to S</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-4">
                  Your marketplace data transformation platform with guaranteed 1:1 row mapping. Create a new product feed 
                  or use Direct Transform for immediate results.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link href="/feed/new">
                    <Button variant="default">Create Feed</Button>
                  </Link>
                  <Link href="/simple-transform">
                    <Button variant="outline" className="flex items-center gap-1">
                      <ArrowUpRight className="h-4 w-4" />
                      Direct Transform
                    </Button>
                  </Link>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="space-y-4">
              <div className="space-y-4">
                <div className="border-l-2 border-blue-500 pl-4 py-1">
                  <p className="text-sm font-medium">Feed "Summer Collection 2023" created</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Today, 3:24 PM</p>
                </div>
                <div className="border-l-2 border-green-500 pl-4 py-1">
                  <p className="text-sm font-medium">Feed "Electronics Q2" exported to Walmart format</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Yesterday, 10:15 AM</p>
                </div>
                <div className="border-l-2 border-red-500 pl-4 py-1">
                  <p className="text-sm font-medium">Feed "Home & Kitchen" failed processing</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">2 days ago, 2:30 PM</p>
                </div>
                <div className="border-l-2 border-slate-500 pl-4 py-1">
                  <p className="text-sm font-medium">API connection created for TikTok catalog</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">3 days ago, 11:05 AM</p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="performance" className="space-y-4">
              <div className="text-center py-8 px-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <BarChart3 className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">Performance analytics coming soon</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                  We're working on detailed analytics about your feeds and transformations.
                </p>
                <Button variant="outline">Join Preview</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}