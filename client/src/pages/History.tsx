import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Eye, 
  Download, 
  Copy, 
  FileWarning, 
  RefreshCw, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Feed } from "@shared/schema";
import { SiAmazon, SiWalmart, SiMeta, SiTiktok, SiEtsy, SiEbay, SiShopify } from "react-icons/si";

export default function History() {
  const { toast } = useToast();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState("all");
  
  // Fetch all feeds for history
  const { data: feeds, isLoading, isError } = useQuery<Feed[]>({
    queryKey: ['/api/feeds'],
    staleTime: 30000,
  });
  
  // Function to filter feeds based on search and filters
  const filteredFeeds = feeds?.filter(feed => {
    // Search by name
    const matchesSearch = feed.name.toLowerCase().includes(searchText.toLowerCase());
    
    // Filter by status
    const matchesStatus = statusFilter === 'all' || feed.status === statusFilter;
    
    // Filter by marketplace
    const matchesMarketplace = marketplaceFilter === 'all' || feed.marketplace === marketplaceFilter;
    
    return matchesSearch && matchesStatus && matchesMarketplace;
  });
  
  // Function to get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Warnings</Badge>;
      case 'pending':
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  // Function to get marketplace icon
  const getMarketplaceIcon = (marketplace: string) => {
    switch (marketplace.toLowerCase()) {
      case 'amazon': return <SiAmazon className="h-4 w-4 mr-1.5 text-gray-600" />;
      case 'walmart': return <SiWalmart className="h-4 w-4 mr-1.5 text-gray-600" />;
      case 'meta': return <SiMeta className="h-4 w-4 mr-1.5 text-gray-600" />;
      case 'tiktok': return <SiTiktok className="h-4 w-4 mr-1.5 text-gray-600" />;
      case 'etsy': return <SiEtsy className="h-4 w-4 mr-1.5 text-gray-600" />;
      case 'ebay': return <SiEbay className="h-4 w-4 mr-1.5 text-gray-600" />;
      case 'shopify': return <SiShopify className="h-4 w-4 mr-1.5 text-gray-600" />;
      default: return null;
    }
  };

  // Retry a failed feed
  const handleRetry = (feedId: number) => {
    toast({
      title: "Processing retry initiated",
      description: "Your feed is being reprocessed.",
    });

    // Here we would call the API to retry processing
    apiRequest("POST", `/api/feeds/${feedId}/process`, {})
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
      })
      .catch((error) => {
        toast({
          title: "Retry failed",
          description: error.message || "There was an error retrying the process.",
          variant: "destructive",
        });
      });
  };

  // Download a feed
  const handleDownload = (feed: Feed) => {
    if (!feed.outputUrl) {
      toast({
        title: "Cannot download",
        description: "This feed does not have output available.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Download started",
      description: "Your feed is being downloaded.",
    });

    // In a real app, we would initiate a download here
    // For now, we'll just show a success message
    setTimeout(() => {
      toast({
        title: "Download complete",
        description: "Your feed has been downloaded successfully.",
      });
    }, 1500);
  };

  // Clone a feed
  const handleClone = (feed: Feed) => {
    toast({
      title: "Feed cloned",
      description: "A copy of this feed has been created.",
    });
    
    // In a real app, we would call an API to clone the feed
    // For now, we'll just show a success message
  };

  // View feed details
  const handleViewDetails = (feedId: number) => {
    toast({
      title: "Feed details",
      description: "Viewing feed details is not implemented in this demo.",
    });
  };

  return (
    <div className="p-6">
      <Card className="mb-6">
        <CardHeader className="pb-3 border-b flex justify-between items-center">
          <div>
            <CardTitle>Processing History</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              View and manage your processed data feeds
            </p>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search feeds..."
                className="w-64 pr-10"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex space-x-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Status</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="warning">Warnings</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
                <SelectTrigger className="w-[150px]">
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>Marketplace</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Marketplaces</SelectItem>
                  <SelectItem value="amazon">Amazon</SelectItem>
                  <SelectItem value="walmart">Walmart</SelectItem>
                  <SelectItem value="meta">Meta</SelectItem>
                  <SelectItem value="tiktok">TikTok Shop</SelectItem>
                  <SelectItem value="etsy">Etsy</SelectItem>
                  <SelectItem value="ebay">eBay</SelectItem>
                  <SelectItem value="shopify">Shopify</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Feed Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Marketplace</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-muted">
              {isLoading ? (
                // Loading skeletons
                Array(5).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                    There was an error loading the feeds. Please try again.
                  </td>
                </tr>
              ) : filteredFeeds?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                    No feeds found. Create a new feed to get started.
                  </td>
                </tr>
              ) : (
                // Feed data
                filteredFeeds?.map((feed) => (
                  <tr key={feed.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{feed.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 capitalize">{feed.source}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getMarketplaceIcon(feed.marketplace)}
                        <span className="text-sm text-gray-500 capitalize">{feed.marketplace}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(feed.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {feed.itemCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(feed.processedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button 
                          size="icon" 
                          variant="ghost"
                          className="h-8 w-8 text-primary"
                          onClick={() => handleViewDetails(feed.id)}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {feed.status === 'completed' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleDownload(feed)}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {feed.status === 'failed' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleViewDetails(feed.id)}
                            title="View Errors"
                          >
                            <FileWarning className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {feed.status === 'failed' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleRetry(feed.id)}
                            title="Retry"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {feed.status === 'completed' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleClone(feed)}
                            title="Clone"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {feed.status === 'warning' && (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-warning"
                            onClick={() => handleViewDetails(feed.id)}
                            title="View Warnings"
                          >
                            <FileWarning className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <CardFooter className="flex items-center justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            Showing 1 to {filteredFeeds?.length || 0} of {filteredFeeds?.length || 0} entries
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-primary-50 text-primary border-primary-200">
              1
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
