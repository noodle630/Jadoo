import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DownloadCloud, FileDown, PlusCircle, RefreshCw, SearchIcon, AlertTriangle, } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// Import our component system
import { MarketplaceIcon } from "@/components/ui/marketplace-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataCard, DataCardStat } from "@/components/ui/data-card";
export default function FeedHistory() {
    var _a;
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [detailsDialog, setDetailsDialog] = useState({
        open: false,
        feed: null,
    });
    // Fetch feed history
    const { data: feeds = [], isLoading, refetch } = useQuery({
        queryKey: ["/api/feeds"],
    });
    // Search function
    const searchFeeds = (feeds) => {
        if (!searchQuery.trim())
            return feeds;
        const query = searchQuery.toLowerCase();
        return feeds.filter((feed) => {
            var _a, _b, _c;
            return ((_a = feed.name) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(query)) ||
                ((_b = feed.marketplace) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(query)) ||
                ((_c = feed.source) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(query)) ||
                String(feed.id).includes(query);
        });
    };
    // Function to normalize status values for consistent handling
    function normalizeStatus(status) {
        const statusMap = {
            "success": "success",
            "completed": "success",
            "error": "error",
            "failed": "error",
            "warning": "warnings",
            "warnings": "warnings",
            "processing": "processing",
            "pending": "pending"
        };
        return statusMap[status === null || status === void 0 ? void 0 : status.toLowerCase()] || "pending";
    }
    // Filter and search feeds
    const processedFeeds = searchFeeds(activeTab === "all"
        ? feeds
        : feeds.filter((feed) => { var _a; return ((_a = feed.marketplace) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === activeTab.toLowerCase(); })).map(feed => (Object.assign(Object.assign({}, feed), { name: feed.name && feed.name.trim() !== "" ? feed.name : `Feed ${feed.id}`, status: normalizeStatus(feed.status) })));
    // Get unique marketplaces for tabs
    const marketplaces = Array.from(new Set(feeds.map((feed) => feed.marketplace))).filter(Boolean);
    // Format date
    const formatDate = (dateString) => {
        if (!dateString)
            return "—";
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };
    // Show feed details dialog
    const showDetails = (feed) => {
        const feedWithName = Object.assign(Object.assign({}, feed), { name: feed.name && feed.name.trim() !== "" ? feed.name : `Feed ${feed.id}` });
        setDetailsDialog({ open: true, feed: feedWithName });
    };
    // Close feed details dialog
    const closeDetails = () => {
        setDetailsDialog({ open: false, feed: null });
    };
    // Handle download
    const handleDownload = (feed) => {
        fetch(`/api/feeds/${feed.id}/download`)
            .then(response => response.blob())
            .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            const fileName = `${feed.name.replace(/\s+/g, '_')}.csv`;
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
    };
    return (<Layout>
      <div className="container py-6 px-4 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Feed History</h1>
            <p className="text-slate-400 text-sm mt-1">Your marketplace feeds</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate("/create-feed")}>
            <PlusCircle className="h-4 w-4 mr-2"/>
            Create Feed
          </Button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div className="relative flex-1 max-w-xs">
            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500"/>
            <Input placeholder="Search feeds..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 bg-slate-900 border-slate-700"/>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="border-slate-700">
            <RefreshCw className="h-3.5 w-3.5 mr-2"/>
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-slate-900 border border-slate-800">
            <TabsTrigger value="all">All</TabsTrigger>
            {marketplaces.map((marketplace) => (<TabsTrigger key={marketplace} value={marketplace === null || marketplace === void 0 ? void 0 : marketplace.toLowerCase()} className="flex items-center gap-1.5">
                <MarketplaceIcon marketplace={marketplace === null || marketplace === void 0 ? void 0 : marketplace.toLowerCase()} size="xs"/>
                {marketplace}
              </TabsTrigger>))}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {isLoading ? (<div className="text-center py-10 text-slate-400">Loading feeds...</div>) : processedFeeds.length === 0 ? (<div className="text-center py-10 border border-slate-800 rounded-lg">
                <FileDown className="mx-auto h-8 w-8 text-slate-500 mb-3"/>
                <h3 className="text-lg font-medium text-white mb-2">No feeds found</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-6">
                  {searchQuery ?
                "No feeds match your search. Try something else?" :
                "Dump in your product data and we'll transform it into marketplace-ready formats."}
                </p>
                <Button onClick={() => navigate("/create-feed")} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <PlusCircle className="h-4 w-4 mr-2"/>
                  Create Feed
                </Button>
              </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedFeeds.map((feed) => {
                var _a;
                return (<DataCard key={feed.id} isClickable onClick={() => showDetails(feed)}>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                            <MarketplaceIcon marketplace={(_a = feed.marketplace) === null || _a === void 0 ? void 0 : _a.toLowerCase()} size="sm"/>
                          </div>
                          <h3 className="text-white font-medium truncate" title={feed.name}>
                            {feed.name}
                          </h3>
                        </div>
                        <StatusBadge status={feed.status} size="sm"/>
                      </div>
                      
                      <div className="flex justify-between items-center mt-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">{feed.itemCount || 0} items</span>
                        </div>
                        <div className="text-slate-500">
                          {formatDate(feed.processedAt)}
                        </div>
                      </div>
                    </div>
                  </DataCard>);
            })}
              </div>)}
          </TabsContent>

          {marketplaces.map((marketplace) => (<TabsContent key={marketplace} value={marketplace === null || marketplace === void 0 ? void 0 : marketplace.toLowerCase()} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {processedFeeds
                .filter(feed => { var _a; return ((_a = feed.marketplace) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === (marketplace === null || marketplace === void 0 ? void 0 : marketplace.toLowerCase()); })
                .map((feed) => {
                var _a;
                return (<DataCard key={feed.id} isClickable onClick={() => showDetails(feed)}>
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                              <MarketplaceIcon marketplace={(_a = feed.marketplace) === null || _a === void 0 ? void 0 : _a.toLowerCase()} size="sm"/>
                            </div>
                            <h3 className="text-white font-medium truncate" title={feed.name}>
                              {feed.name}
                            </h3>
                          </div>
                          <StatusBadge status={feed.status} size="sm"/>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400">{feed.itemCount || 0} items</span>
                          </div>
                          <div className="text-slate-500">
                            {formatDate(feed.processedAt)}
                          </div>
                        </div>
                      </div>
                    </DataCard>);
            })}
              </div>
            </TabsContent>))}
        </Tabs>

        {/* Feed Details Dialog */}
        {detailsDialog.feed && (<Dialog open={detailsDialog.open} onOpenChange={closeDetails}>
            <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl font-bold text-white">
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                    <MarketplaceIcon marketplace={(_a = detailsDialog.feed.marketplace) === null || _a === void 0 ? void 0 : _a.toLowerCase()} size="sm"/>
                  </div>
                  {detailsDialog.feed.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <DataCardStat label="Status" value={<StatusBadge status={detailsDialog.feed.status} size="xs"/>}/>
                  
                  <DataCardStat label="Source" value={<span className="capitalize">{detailsDialog.feed.source}</span>}/>
                  
                  <DataCardStat label="Items" value={detailsDialog.feed.itemCount || "—"}/>
                  
                  <DataCardStat label="Date" value={formatDate(detailsDialog.feed.processedAt)}/>
                </div>

                {detailsDialog.feed.errorDetails && (<div className="mt-4 bg-red-900/20 border border-red-800/50 rounded p-3 space-y-2">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertTriangle className="h-4 w-4"/>
                      <span className="font-medium">Error</span>
                    </div>
                    <div className="text-red-300 text-sm">{detailsDialog.feed.errorDetails.message}</div>
                  </div>)}
              </div>
              
              <DialogFooter>
                {detailsDialog.feed.outputUrl && (<Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleDownload(detailsDialog.feed)}>
                    <DownloadCloud className="h-4 w-4 mr-2"/>
                    Download
                  </Button>)}
              </DialogFooter>
            </DialogContent>
          </Dialog>)}
      </div>
    </Layout>);
}
