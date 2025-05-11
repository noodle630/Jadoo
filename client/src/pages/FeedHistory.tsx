import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DownloadCloud,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpDown,
  FileDown,
  Info,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// Define feed types
interface Feed {
  id: number;
  name: string;
  source: string;
  marketplace: string;
  status: "success" | "processing" | "error" | "pending";
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
  const [sortConfig, setSortConfig] = useState<{ key: keyof Feed; direction: "asc" | "desc" }>({
    key: "processedAt",
    direction: "desc",
  });
  const [activeTab, setActiveTab] = useState<string>("all");
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; feed: Feed | null }>({
    open: false,
    feed: null,
  });

  // Fetch feed history
  const { data: feeds = [], isLoading } = useQuery<Feed[]>({
    queryKey: ["/api/feeds"],
  });

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

  // Filter feeds based on active tab
  const filteredFeeds = activeTab === "all" 
    ? sortedFeeds 
    : sortedFeeds.filter((feed) => feed.marketplace === activeTab);

  // Get unique marketplaces for tabs
  const marketplaces = Array.from(new Set(feeds.map((feed) => feed.marketplace))).filter(Boolean);

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  // Show feed details dialog
  const showDetails = (feed: Feed) => {
    setDetailsDialog({ open: true, feed });
  };

  // Close feed details dialog
  const closeDetails = () => {
    setDetailsDialog({ open: false, feed: null });
  };

  // Function to get status badge
  const getStatusBadge = (status: Feed['status']) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Processing
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-900/20 text-yellow-400 border-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-slate-800 text-slate-400">
            Unknown
          </Badge>
        );
    }
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
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-slate-900 border-slate-800">
                        <TableHead className="w-[250px]">
                          <Button
                            variant="ghost"
                            className="p-0 font-medium"
                            onClick={() => requestSort("name")}
                          >
                            Feed Name
                            <ArrowUpDown
                              className={`h-4 w-4 ml-2 ${
                                sortConfig.key === "name" ? "opacity-100" : "opacity-40"
                              }`}
                            />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="p-0 font-medium"
                            onClick={() => requestSort("marketplace")}
                          >
                            Marketplace
                            <ArrowUpDown
                              className={`h-4 w-4 ml-2 ${
                                sortConfig.key === "marketplace" ? "opacity-100" : "opacity-40"
                              }`}
                            />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="p-0 font-medium"
                            onClick={() => requestSort("status")}
                          >
                            Status
                            <ArrowUpDown
                              className={`h-4 w-4 ml-2 ${
                                sortConfig.key === "status" ? "opacity-100" : "opacity-40"
                              }`}
                            />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="p-0 font-medium"
                            onClick={() => requestSort("itemCount")}
                          >
                            Products
                            <ArrowUpDown
                              className={`h-4 w-4 ml-2 ${
                                sortConfig.key === "itemCount" ? "opacity-100" : "opacity-40"
                              }`}
                            />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            className="p-0 font-medium"
                            onClick={() => requestSort("processedAt")}
                          >
                            Processed At
                            <ArrowUpDown
                              className={`h-4 w-4 ml-2 ${
                                sortConfig.key === "processedAt" ? "opacity-100" : "opacity-40"
                              }`}
                            />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFeeds.length === 0 ? (
                        <TableRow className="hover:bg-slate-900 border-slate-800">
                          <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                            No feed history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFeeds.map((feed) => (
                          <TableRow
                            key={feed.id}
                            className="hover:bg-slate-800/50 border-slate-800"
                          >
                            <TableCell className="font-medium">{feed.name}</TableCell>
                            <TableCell>
                              {feed.marketplace.charAt(0).toUpperCase() + feed.marketplace.slice(1)}
                            </TableCell>
                            <TableCell>{getStatusBadge(feed.status)}</TableCell>
                            <TableCell>{feed.itemCount || "—"}</TableCell>
                            <TableCell>{formatDate(feed.processedAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => showDetails(feed)}
                                >
                                  <span className="sr-only">View details</span>
                                  <Info size={16} />
                                </Button>

                                {feed.status === "success" && feed.outputUrl && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => window.open(feed.outputUrl!, "_blank")}
                                  >
                                    <span className="sr-only">Download</span>
                                    <FileDown size={16} />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Details Dialog */}
        {detailsDialog.feed && (
          <Dialog open={detailsDialog.open} onOpenChange={closeDetails}>
            <DialogContent className="max-w-2xl bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-xl">{detailsDialog.feed.name}</DialogTitle>
                <DialogDescription>
                  Created on {formatDate(detailsDialog.feed.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="p-3 bg-slate-800 rounded-md">
                  <div className="text-sm text-slate-400 mb-1">Marketplace</div>
                  <div className="font-medium">
                    {detailsDialog.feed.marketplace.charAt(0).toUpperCase() +
                      detailsDialog.feed.marketplace.slice(1)}
                  </div>
                </div>
                <div className="p-3 bg-slate-800 rounded-md">
                  <div className="text-sm text-slate-400 mb-1">Status</div>
                  <div className="font-medium">{getStatusBadge(detailsDialog.feed.status)}</div>
                </div>
                <div className="p-3 bg-slate-800 rounded-md">
                  <div className="text-sm text-slate-400 mb-1">Products</div>
                  <div className="font-medium">{detailsDialog.feed.itemCount || "—"}</div>
                </div>
                <div className="p-3 bg-slate-800 rounded-md">
                  <div className="text-sm text-slate-400 mb-1">Source</div>
                  <div className="font-medium">{detailsDialog.feed.source}</div>
                </div>
                <div className="p-3 bg-slate-800 rounded-md col-span-2">
                  <div className="text-sm text-slate-400 mb-1">Processed At</div>
                  <div className="font-medium">{formatDate(detailsDialog.feed.processedAt)}</div>
                </div>
              </div>

              {detailsDialog.feed.status === "error" && detailsDialog.feed.errorDetails && (
                <div className="my-4">
                  <div className="p-4 bg-red-900/20 border border-red-800 rounded-md mb-2">
                    <h4 className="text-red-400 font-medium mb-1">Error Details</h4>
                    <p className="text-slate-300">{detailsDialog.feed.errorDetails.message}</p>
                    <div className="mt-2 text-sm text-slate-400">
                      {detailsDialog.feed.errorDetails.count} issues found
                    </div>
                  </div>

                  {detailsDialog.feed.errorDetails.items && (
                    <div className="max-h-40 overflow-y-auto mt-4 text-sm">
                      <div className="grid grid-cols-[1fr_2fr] gap-2 font-medium text-slate-300 mb-2">
                        <div>SKU</div>
                        <div>Issue</div>
                      </div>
                      {detailsDialog.feed.errorDetails.items.map((item, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-[1fr_2fr] gap-2 py-1 border-t border-slate-800"
                        >
                          <div className="text-slate-400">{item.sku}</div>
                          <div className="text-slate-400">{item.issue}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="gap-2">
                {detailsDialog.feed.status === "success" && detailsDialog.feed.outputUrl && (
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => window.open(detailsDialog.feed.outputUrl!, "_blank")}
                  >
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Feed
                  </Button>
                )}

                <Button variant="outline" onClick={closeDetails}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
}