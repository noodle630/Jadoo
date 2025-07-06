import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
// Icons
import { DownloadCloud, Clock, Check, AlertCircle, Loader2, Calendar, Settings2, Trash2 } from "lucide-react";
export default function FeedHistory() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('all');
    // Fetch feed history
    const { data: feeds = [], isLoading, error } = useQuery({
        queryKey: ['/api/feeds'],
        // Placeholder data for design purposes (would be removed in production)
        placeholderData: [
            {
                id: 1,
                name: "Summer Collection 2023",
                marketplace: "amazon",
                status: "completed",
                processedAt: new Date().toISOString(),
                source: "file",
                itemCount: 243
            },
            {
                id: 2,
                name: "Electronics Q2",
                marketplace: "walmart",
                status: "completed",
                processedAt: new Date(Date.now() - 86400000).toISOString(),
                source: "file",
                itemCount: 118
            },
            {
                id: 3,
                name: "Home & Kitchen",
                marketplace: "meta",
                status: "failed",
                processedAt: new Date(Date.now() - 172800000).toISOString(),
                source: "api",
                itemCount: null
            },
            {
                id: 4,
                name: "Spring Fashion",
                marketplace: "tiktok",
                status: "processing",
                processedAt: new Date(Date.now() - 1800000).toISOString(),
                source: "file",
                itemCount: null
            },
            {
                id: 5,
                name: "Mobile Accessories",
                marketplace: "catch",
                status: "completed",
                processedAt: new Date(Date.now() - 259200000).toISOString(),
                source: "file",
                itemCount: 76
            }
        ]
    });
    // Filter feeds based on active tab
    const filteredFeeds = feeds.filter(feed => {
        if (activeTab === 'all')
            return true;
        if (activeTab === 'amazon')
            return feed.marketplace === 'amazon';
        if (activeTab === 'walmart')
            return feed.marketplace === 'walmart';
        if (activeTab === 'others') {
            return !['amazon', 'walmart'].includes(feed.marketplace);
        }
        return true;
    });
    const handleDownload = (id) => {
        const url = `/api/simple-download/${id}`;
        window.location.href = url;
    };
    const handleDelete = (id) => {
        toast({
            title: "Feed deleted",
            description: "Feed has been removed from your history.",
        });
    };
    // Status badge styling helper
    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (<Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <Check size={14} className="mr-1"/> Completed
          </Badge>);
            case 'processing':
                return (<Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">
            <Loader2 size={14} className="mr-1 animate-spin"/> Processing
          </Badge>);
            case 'failed':
                return (<Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <AlertCircle size={14} className="mr-1"/> Failed
          </Badge>);
            default:
                return (<Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800">
            {status}
          </Badge>);
        }
    };
    // Marketplace badge styling helper
    const getMarketplaceBadge = (marketplace) => {
        const marketplaceColors = {
            amazon: {
                bg: 'bg-orange-50',
                text: 'text-orange-700',
                border: 'border-orange-200',
                darkBg: 'dark:bg-orange-900/20',
                darkText: 'dark:text-orange-400',
                darkBorder: 'dark:border-orange-800'
            },
            walmart: {
                bg: 'bg-blue-50',
                text: 'text-blue-700',
                border: 'border-blue-200',
                darkBg: 'dark:bg-blue-900/20',
                darkText: 'dark:text-blue-400',
                darkBorder: 'dark:border-blue-800'
            },
            meta: {
                bg: 'bg-indigo-50',
                text: 'text-indigo-700',
                border: 'border-indigo-200',
                darkBg: 'dark:bg-indigo-900/20',
                darkText: 'dark:text-indigo-400',
                darkBorder: 'dark:border-indigo-800'
            },
            tiktok: {
                bg: 'bg-slate-50',
                text: 'text-slate-700',
                border: 'border-slate-200',
                darkBg: 'dark:bg-slate-900/20',
                darkText: 'dark:text-slate-400',
                darkBorder: 'dark:border-slate-800'
            },
            catch: {
                bg: 'bg-purple-50',
                text: 'text-purple-700',
                border: 'border-purple-200',
                darkBg: 'dark:bg-purple-900/20',
                darkText: 'dark:text-purple-400',
                darkBorder: 'dark:border-purple-800'
            },
            reebelo: {
                bg: 'bg-green-50',
                text: 'text-green-700',
                border: 'border-green-200',
                darkBg: 'dark:bg-green-900/20',
                darkText: 'dark:text-green-400',
                darkBorder: 'dark:border-green-800'
            }
        };
        const styles = marketplaceColors[marketplace] || marketplaceColors.tiktok;
        return (<Badge variant="outline" className={`${styles.bg} ${styles.text} ${styles.border} ${styles.darkBg} ${styles.darkText} ${styles.darkBorder} uppercase text-xs font-medium py-0.5`}>
        {marketplace}
      </Badge>);
    };
    // Date formatting helper
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    // Instead of early returns, use conditional rendering
    let content;
    if (isLoading) {
        content = (<CardContent className="grid place-items-center h-40">
        <Loader2 className="h-8 w-8 text-blue-600 dark:text-blue-400 animate-spin"/>
      </CardContent>);
    }
    else if (error) {
        content = (<CardContent>
        <div className="p-4 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/10 dark:border-red-800 text-red-700 dark:text-red-400">
          <p>Could not load feed history. Please try again later.</p>
        </div>
      </CardContent>);
    }
    else {
        content = (<CardContent className="pt-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="amazon">Amazon</TabsTrigger>
            <TabsTrigger value="walmart">Walmart</TabsTrigger>
            <TabsTrigger value="others">Others</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="space-y-4">
            {filteredFeeds.length === 0 ? (<div className="text-center py-8 px-4">
                <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Settings2 className="h-6 w-6 text-slate-500 dark:text-slate-400"/>
                </div>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">No feeds found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  There are no feeds in this category yet.
                </p>
                <Button variant="outline" className="mr-2">Create New Feed</Button>
              </div>) : (<div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredFeeds.map((feed) => (<div key={feed.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getMarketplaceBadge(feed.marketplace)}
                        {getStatusBadge(feed.status)}
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                          <Calendar className="h-3 w-3 mr-1"/> {formatDate(feed.processedAt)}
                        </span>
                      </div>
                      <h4 className="text-base font-medium truncate mb-0.5">{feed.name}</h4>
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <span className="pr-2 mr-2 border-r border-slate-200 dark:border-slate-700">
                          Source: {feed.source === 'file' ? 'File Upload' : 'API Connection'}
                        </span>
                        {feed.itemCount && (<span>{feed.itemCount.toLocaleString()} products</span>)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      {feed.status === 'completed' && (<Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handleDownload(feed.id)}>
                          <DownloadCloud className="h-4 w-4 mr-1"/>
                          <span>Download</span>
                        </Button>)}
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500" onClick={() => handleDelete(feed.id)}>
                        <Trash2 className="h-4 w-4"/>
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>))}
              </div>)}
          </TabsContent>
        </Tabs>
      </CardContent>);
    }
    // Single return statement to fix the React hooks issue
    return (<Card className="mb-6 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className={`pb-3 ${!isLoading && !error ? 'border-b border-slate-200 dark:border-slate-800' : ''}`}>
        <CardTitle className="text-xl font-bold flex items-center">
          <Clock className="mr-2 h-5 w-5"/> Feed History
        </CardTitle>
        <CardDescription>
          {isLoading
            ? "Loading your transformation history..."
            : error
                ? "There was an error loading your transformation history"
                : "Your recent data transformations"}
        </CardDescription>
      </CardHeader>
      {content}
    </Card>);
}
