import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DownloadCloud,
  FileDown,
  PlusCircle,
  Clock,
  RefreshCw,
  SearchIcon,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Import our new component system
import { DataCard } from "@/components/ui/data-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { MarketplaceIcon } from "@/components/ui/marketplace-icon";

// Define feed types
interface Feed {
  id: number;
  name: string;
  source: string;
  marketplace: string;
  status: "success" | "processing" | "error" | "pending" | "completed" | "failed" | "warnings";
  itemCount: number | null;
  processedAt: string | null;
  createdAt: string;
  outputUrl: string | null;
  errorDetails?: {
    message: string;
    count: number;
    items?: {
      sku: string;
      issue: string;
    }[];
  } | null;
}

export default function FeedHistory() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [sortConfig, setSortConfig] = useState<{ key: keyof Feed; direction: "asc" | "desc" }>({
    key: "processedAt",
    direction: "desc",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; feed: Feed | null }>({
    open: false,
    feed: null,
  });

  // Fetch feed history
  const { data: feeds = [], isLoading, isError, refetch } = useQuery<Feed[]>({
    queryKey: ["/api/feeds"],
  });
  
  // Debug feeds in useEffect with detailed logging
  useEffect(() => {
    console.log("Feeds loaded:", feeds);
    
    // Log each feed's name property for debugging
    feeds.forEach((feed, index) => {
      console.log(`Feed ${index + 1} (ID: ${feed.id}):`, { 
        name: feed.name,
        nameEmpty: !feed.name,
        nameTrimEmpty: feed.name ? feed.name.trim() === "" : true,
        displayName: !feed.name || feed.name.trim() === "" ? `Untitled Feed ${feed.id}` : feed.name
      });
    });
  }, [feeds]);

  // Handle sorting
  const sortedFeeds = [...feeds].sort((a, b) => {
    if (a[sortConfig.key] === null) return 1;
    if (b[sortConfig.key] === null) return -1;

    if (sortConfig.key === "processedAt" || sortConfig.key === "createdAt") {
      const aDate = a[sortConfig.key] ? new Date(a[sortConfig.key] as string).getTime() : 0;
      const bDate = b[sortConfig.key] ? new Date(b[sortConfig.key] as string).getTime() : 0;
      return sortConfig.direction === "asc" ? aDate - bDate : bDate - aDate;
    }

    // String comparison
    const aValue = String(a[sortConfig.key] || "");
    const bValue = String(b[sortConfig.key] || "");
    return sortConfig.direction === "asc"
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue);
  });

  // Function to request sort
  const requestSort = (key: keyof Feed) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  // Search function
  const searchFeeds = (feeds: Feed[]) => {
    if (!searchQuery.trim()) return feeds;
    
    const query = searchQuery.toLowerCase();
    return feeds.filter((feed) => 
      feed.name.toLowerCase().includes(query) || 
      feed.marketplace.toLowerCase().includes(query) ||
      feed.source.toLowerCase().includes(query) ||
      String(feed.id).includes(query)
    );
  };

  // Function to normalize status values for consistent handling
  function normalizeStatus(status: string): Feed["status"] {
    // Map various status values to our defined types
    const statusMap: Record<string, Feed["status"]> = {
      "success": "success",
      "completed": "success",
      "error": "error", 
      "failed": "error",
      "warning": "warnings",
      "warnings": "warnings",
      "processing": "processing",
      "pending": "pending"
    };
    
    return statusMap[status.toLowerCase()] || "pending";
  }

  // Filter and search feeds
  const processedFeeds = searchFeeds(
    activeTab === "all" 
      ? sortedFeeds 
      : sortedFeeds.filter((feed) => feed.marketplace.toLowerCase() === activeTab.toLowerCase())
  ).map(feed => ({
    ...feed,
    name: feed.name && feed.name.trim() !== "" ? feed.name : `Untitled Feed ${feed.id}`,
    // Normalize status values
    status: normalizeStatus(feed.status)
  }));

  // Get unique marketplaces for tabs
  const marketplaces = Array.from(new Set(feeds.map((feed) => feed.marketplace))).filter(Boolean);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Format time
  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format date without time
  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Show feed details dialog
  const showDetails = (feed: Feed) => {
    // Create a copy of the feed to ensure name is displayed correctly
    const feedWithName = {
      ...feed,
      name: feed.name && feed.name.trim() !== "" ? feed.name : `Untitled Feed ${feed.id}`
    };
    setDetailsDialog({ open: true, feed: feedWithName });
  };

  // Close feed details dialog
  const closeDetails = () => {
    setDetailsDialog({ open: false, feed: null });
  };

  // Get status type for the badge
  const getStatusType = (status: Feed['status']): "success" | "warning" | "error" | "processing" | "pending" | "info" => {
    switch (status) {
      case "success":
      case "completed":
        return "success";
      case "processing":
        return "processing";
      case "error":
      case "failed":
        return "error";
      case "pending":
        return "pending";
      case "warnings":
        return "warning";
      default:
        return "info";
    }
  };

  // Get status label
  const getStatusLabel = (status: Feed['status']): string => {
    switch (status) {
      case "success":
      case "completed":
        return "Success";
      case "processing":
        return "Processing";
      case "error":
      case "failed":
        return "Error";
      case "pending":
        return "Pending";
      case "warnings":
        return "Warnings";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };
  
  // Function to get status badge
  const getStatusBadge = (status: Feed['status']) => {
    return (
      <StatusBadge 
        status={getStatusType(status)}
        label={getStatusLabel(status)}
      />
    );
  };

  return (
    <Layout>
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Feed History</h1>
            <p className="text-slate-400 text-sm">View and manage your marketplace product feeds</p>
          </div>
          <Button 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0"
            onClick={() => navigate("/create-feed")}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Feed
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <TabsList className="mb-2 bg-slate-900/70 border border-slate-800 p-1 overflow-x-auto flex-wrap">
              <TabsTrigger value="all" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                All Feeds
              </TabsTrigger>
              {marketplaces.map((marketplace) => (
                <TabsTrigger 
                  key={marketplace} 
                  value={marketplace.toLowerCase()}
                  className="data-[state=active]:bg-slate-800 data-[state=active]:text-white flex items-center gap-1.5"
                >
                  <MarketplaceIcon marketplace={marketplace.toLowerCase() as any} size="xs" />
                  {marketplace}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetch()}
                className="hidden md:flex border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2" />
                Refresh
              </Button>
              <div className="relative flex-1 md:flex-auto">
                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search feeds..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 w-full md:w-60 bg-slate-900/70 border-slate-700 focus:border-slate-600"
                />
              </div>
            </div>
          </div>

          <TabsContent value="all" className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="border border-slate-800 rounded-lg p-4 bg-slate-900/70">
                    <Skeleton className="h-6 w-2/3 mb-3 bg-slate-800" />
                    <Skeleton className="h-4 w-1/2 mb-2 bg-slate-800" />
                    <Skeleton className="h-4 w-3/4 mb-4 bg-slate-800" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-16 bg-slate-800" />
                      <Skeleton className="h-4 w-24 bg-slate-800" />
                    </div>
                  </div>
                ))}
              </div>
            ) : processedFeeds.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-4">
                  <FileDown className="text-slate-400 h-6 w-6" />
                </div>
                <h3 className="text-lg font-medium mb-2 text-white">No feeds found</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-6">
                  {searchQuery ? 
                    "No feeds match your search query. Try a different search term." :
                    "You haven't created any feed transformations yet. Convert your product data into marketplace-ready formats."}
                </p>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0" onClick={() => navigate("/create-feed")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create New Feed
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedFeeds.map((feed) => (
                  <DataCard 
                    key={feed.id}
                    title={feed.name}
                    subtitle={
                      <div className="flex items-center gap-2">
                        <span className="capitalize">{feed.source}</span>
                        <span className="text-slate-600">•</span>
                        <span>{formatShortDate(feed.processedAt)}</span>
                      </div>
                    }
                    badge={{
                      label: getStatusLabel(feed.status),
                      variant: getStatusType(feed.status) as any,
                    }}
                    icon={<MarketplaceIcon marketplace={feed.marketplace.toLowerCase() as any} size="md" />}
                    iconBackground={`bg-slate-800/70`}
                    onClick={() => showDetails(feed)}
                    footer={
                      <div className="w-full flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-slate-400">Items:</span>
                          <span className="font-medium text-white">{feed.itemCount || "—"}</span>
                        </div>
                        {feed.outputUrl && (
                          <Button variant="outline" size="sm" className="h-7 px-2.5 py-1 border-slate-700 hover:bg-slate-800">
                            <DownloadCloud className="h-3.5 w-3.5 mr-1.5" />
                            Download
                          </Button>
                        )}
                      </div>
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {marketplaces.map((marketplace) => (
            <TabsContent key={marketplace} value={marketplace.toLowerCase()} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedFeeds
                  .filter(feed => feed.marketplace.toLowerCase() === marketplace.toLowerCase())
                  .map((feed) => (
                    <DataCard 
                      key={feed.id}
                      title={feed.name}
                      subtitle={
                        <div className="flex items-center gap-2">
                          <span className="capitalize">{feed.source}</span>
                          <span className="text-slate-600">•</span>
                          <span>{formatShortDate(feed.processedAt)}</span>
                        </div>
                      }
                      badge={{
                        label: getStatusLabel(feed.status),
                        variant: getStatusType(feed.status) as any,
                      }}
                      icon={<MarketplaceIcon marketplace={feed.marketplace.toLowerCase() as any} size="md" />}
                      iconBackground={`bg-slate-800/70`}
                      onClick={() => showDetails(feed)}
                      footer={
                        <div className="w-full flex justify-between items-center">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="text-slate-400">Items:</span>
                            <span className="font-medium text-white">{feed.itemCount || "—"}</span>
                          </div>
                          {feed.outputUrl && (
                            <Button variant="outline" size="sm" className="h-7 px-2.5 py-1 border-slate-700 hover:bg-slate-800">
                              <DownloadCloud className="h-3.5 w-3.5 mr-1.5" />
                              Download
                            </Button>
                          )}
                        </div>
                      }
                    />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Feed Details Dialog */}
        {detailsDialog.feed && (
          <Dialog open={detailsDialog.open} onOpenChange={closeDetails}>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                    <MarketplaceIcon 
                      marketplace={detailsDialog.feed.marketplace.toLowerCase() as any} 
                      size="md" 
                    />
                  </div>
                  {detailsDialog.feed.name}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Created on {formatDate(detailsDialog.feed.createdAt)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-5 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-800/40 p-3 rounded-lg space-y-1">
                    <div className="text-sm text-slate-400">Status</div>
                    <div className="flex items-center gap-2">
                      <StatusBadge 
                        status={getStatusType(detailsDialog.feed.status)}
                        label={getStatusLabel(detailsDialog.feed.status)}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/40 p-3 rounded-lg space-y-1">
                    <div className="text-sm text-slate-400">Source</div>
                    <div className="text-white capitalize flex items-center">
                      {detailsDialog.feed.source === 'csv' ? (
                        <FileDown className="h-4 w-4 mr-1.5 text-blue-400" />
                      ) : (
                        <ExternalLink className="h-4 w-4 mr-1.5 text-green-400" />
                      )}
                      {detailsDialog.feed.source}
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/40 p-3 rounded-lg space-y-1">
                    <div className="text-sm text-slate-400">Items</div>
                    <div className="text-white font-medium">{detailsDialog.feed.itemCount || "—"}</div>
                  </div>
                  
                  <div className="bg-slate-800/40 p-3 rounded-lg space-y-1">
                    <div className="text-sm text-slate-400">Processed</div>
                    <div className="text-white">{formatDate(detailsDialog.feed.processedAt)}</div>
                  </div>
                </div>

                {detailsDialog.feed.errorDetails && (
                  <div className="mt-4 bg-red-900/20 border border-red-800/50 rounded-lg p-3 space-y-3">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-semibold">Error Details</span>
                    </div>
                    <div className="text-red-300 text-sm">{detailsDialog.feed.errorDetails.message}</div>
                    
                    {detailsDialog.feed.errorDetails.items && detailsDialog.feed.errorDetails.items.length > 0 && (
                      <div>
                        <div className="text-slate-400 text-sm mb-2">
                          {detailsDialog.feed.errorDetails.count} issue{detailsDialog.feed.errorDetails.count !== 1 ? "s" : ""} found
                        </div>
                        <ScrollArea className="h-36 rounded overflow-hidden">
                          <div className="space-y-2">
                            {detailsDialog.feed.errorDetails.items.map((item, index) => (
                              <div key={index} className="flex text-sm bg-red-900/20 p-2 rounded">
                                <div className="font-mono text-slate-300 mr-2">{item.sku}:</div>
                                <div className="text-red-300">{item.issue}</div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 text-slate-400 hover:text-slate-300"
                  onClick={() => {
                    toast({
                      title: "Copied feed ID to clipboard",
                      description: `Feed ID: ${detailsDialog.feed!.id}`,
                    });
                    navigator.clipboard.writeText(detailsDialog.feed!.id.toString());
                  }}
                >
                  <span className="text-xs">ID: {detailsDialog.feed.id}</span>
                </Button>
                
                {detailsDialog.feed.outputUrl && (
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 flex items-center gap-2"
                    onClick={() => {
                      // Download the feed output
                      fetch(`/api/feeds/${detailsDialog.feed!.id}/download`)
                        .then(response => response.blob())
                        .then(blob => {
                          // Create a download link and trigger it
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          const fileName = `${detailsDialog.feed!.name.replace(/\s+/g, '_')}.csv`;
                          a.href = url;
                          a.download = fileName;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          
                          toast({
                            title: "Download started",
                            description: `Downloading ${fileName}`,
                          });
                        })
                        .catch(error => {
                          console.error('Error downloading file:', error);
                          toast({
                            variant: "destructive",
                            title: "Download failed",
                            description: "Could not download file. Please try again later.",
                          });
                        });
                    }}
                  >
                    <DownloadCloud className="h-4 w-4" />
                    <span>Download Feed</span>
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}