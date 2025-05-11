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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Feed History</h1>
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => navigate("/feed/new")}
          >
            <DownloadCloud size={16} />
            <span>Create New Feed</span>
          </Button>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Feeds</TabsTrigger>
            {marketplaces.map((marketplace) => (
              <TabsTrigger key={marketplace} value={marketplace}>
                {marketplace.charAt(0).toUpperCase() + marketplace.slice(1)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {filteredFeeds.length === 0 ? (
              <div className="flex items-center justify-center py-12 px-4 bg-slate-900 border border-slate-800 rounded-lg">
                <p className="text-slate-500">No feed history found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFeeds.map((feed) => (
                  <Card 
                    key={feed.id} 
                    className="bg-slate-900/70 border-slate-800 hover:bg-slate-800/80 transition-all cursor-pointer overflow-hidden"
                    onClick={() => showDetails(feed)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white truncate" title={feed.name}>
                            {feed.name}
                          </h3>
                        </div>
                        <div>
                          {getStatusBadge(feed.status)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
                        <span className="bg-slate-800 px-2 py-0.5 rounded capitalize">{feed.source}</span>
                        <span className="text-slate-600">•</span>
                        {getMarketplaceIcon(feed.marketplace)}
                      </div>
                      
                      <div className="flex justify-between items-center text-sm">
                        <div className="text-blue-400">
                          {feed.itemCount || 0} items
                        </div>
                        <div className="text-slate-500 text-xs">
                          {formatDate(feed.processedAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {detailsDialog.feed && (
          <Dialog open={detailsDialog.open} onOpenChange={closeDetails}>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-xl">{detailsDialog.feed.name}</DialogTitle>
                <DialogDescription>
                  Created on {formatDate(detailsDialog.feed.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="text-sm text-slate-500">Status</div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(detailsDialog.feed.status)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-500">Marketplace</div>
                    <div>{getMarketplaceIcon(detailsDialog.feed.marketplace)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-500">Source</div>
                    <div className="text-slate-200 capitalize">{detailsDialog.feed.source}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-500">Items</div>
                    <div className="text-slate-200">{detailsDialog.feed.itemCount || "—"}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-500">Created</div>
                    <div className="text-slate-200">{formatDate(detailsDialog.feed.createdAt)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-500">Processed</div>
                    <div className="text-slate-200">{formatDate(detailsDialog.feed.processedAt)}</div>
                  </div>
                </div>

                {detailsDialog.feed.errorDetails && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle size={16} />
                      <span className="font-semibold">Error Details</span>
                    </div>
                    <div className="text-red-300">{detailsDialog.feed.errorDetails.message}</div>
                    <div className="text-slate-400">
                      {detailsDialog.feed.errorDetails.count} issue{detailsDialog.feed.errorDetails.count !== 1 ? "s" : ""} found
                    </div>

                    {detailsDialog.feed.errorDetails.items && detailsDialog.feed.errorDetails.items.length > 0 && (
                      <div className="bg-slate-800/50 p-3 rounded-md space-y-2 max-h-40 overflow-y-auto">
                        {detailsDialog.feed.errorDetails.items.map((item, index) => (
                          <div key={index} className="flex text-sm">
                            <div className="font-mono text-slate-300 mr-2">{item.sku}:</div>
                            <div className="text-red-300">{item.issue}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="sm:justify-between flex flex-col sm:flex-row gap-2">
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    onClick={() => {
                      toast({
                        title: "Copied feed ID to clipboard",
                        description: `Feed ID: ${detailsDialog.feed!.id}`,
                      });
                      navigator.clipboard.writeText(detailsDialog.feed!.id.toString());
                    }}
                  >
                    <span className="text-xs text-slate-500">ID: {detailsDialog.feed.id}</span>
                  </Button>
                </div>
                {detailsDialog.feed.outputUrl && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      // Download the feed output
                      fetch(`/api/feeds/${detailsDialog.feed!.id}/download`)
                        .then(response => response.blob())
                        .then(blob => {
                          // Create a download link and trigger it
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          const fileName = `${detailsDialog.feed.name}.csv`;
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
                            description: "There was an error downloading the file.",
                          });
                        });
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                    <span>Download Output</span>
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