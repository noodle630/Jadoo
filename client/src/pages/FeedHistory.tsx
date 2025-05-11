import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
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
  const { toast } = useToast();
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
                        <TableHead className="w-[180px] uppercase text-xs text-slate-500 font-medium">
                          <div className="flex items-center">
                            <span>Feed Name</span>
                            <ArrowUpDown
                              className={`h-3.5 w-3.5 ml-1 cursor-pointer ${
                                sortConfig.key === "name" ? "text-blue-400" : "text-slate-600"
                              }`}
                              onClick={() => requestSort("name")}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="uppercase text-xs text-slate-500 font-medium">
                          <div className="flex items-center">
                            <span>Source</span>
                            <ArrowUpDown
                              className={`h-3.5 w-3.5 ml-1 cursor-pointer ${
                                sortConfig.key === "source" ? "text-blue-400" : "text-slate-600"
                              }`}
                              onClick={() => requestSort("source")}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="uppercase text-xs text-slate-500 font-medium">
                          <div className="flex items-center">
                            <span>Marketplace</span>
                            <ArrowUpDown
                              className={`h-3.5 w-3.5 ml-1 cursor-pointer ${
                                sortConfig.key === "marketplace" ? "text-blue-400" : "text-slate-600"
                              }`}
                              onClick={() => requestSort("marketplace")}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="uppercase text-xs text-slate-500 font-medium">
                          <div className="flex items-center">
                            <span>Status</span>
                            <ArrowUpDown
                              className={`h-3.5 w-3.5 ml-1 cursor-pointer ${
                                sortConfig.key === "status" ? "text-blue-400" : "text-slate-600"
                              }`}
                              onClick={() => requestSort("status")}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="uppercase text-xs text-slate-500 font-medium">
                          <div className="flex items-center">
                            <span>Items</span>
                            <ArrowUpDown
                              className={`h-3.5 w-3.5 ml-1 cursor-pointer ${
                                sortConfig.key === "itemCount" ? "text-blue-400" : "text-slate-600"
                              }`}
                              onClick={() => requestSort("itemCount")}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="uppercase text-xs text-slate-500 font-medium">
                          <div className="flex items-center">
                            <span>Date</span>
                            <ArrowUpDown
                              className={`h-3.5 w-3.5 ml-1 cursor-pointer ${
                                sortConfig.key === "processedAt" ? "text-blue-400" : "text-slate-600"
                              }`}
                              onClick={() => requestSort("processedAt")}
                            />
                          </div>
                        </TableHead>
                        <TableHead className="uppercase text-xs text-slate-500 font-medium text-right">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFeeds.length === 0 ? (
                        <TableRow className="hover:bg-slate-900 border-slate-800">
                          <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                            No feed history found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredFeeds.map((feed) => (
                          <TableRow
                            key={feed.id}
                            className="hover:bg-slate-800/50 border-slate-800"
                          >
                            <TableCell className="font-medium text-slate-200">
                              {feed.name || `Untitled Feed ${feed.id}`}
                            </TableCell>
                            <TableCell className="text-slate-400 capitalize">
                              {feed.source}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {feed.marketplace === 'amazon' && (
                                  <span className="text-slate-300 flex items-center">
                                    <svg className="mr-1.5 h-4 w-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M14.0231 11.348C13.1458 11.348 12.4323 11.4122 11.8826 11.5406C11.1691 11.7011 10.6621 11.99 10.3084 12.4072C9.98856 12.7923 9.82866 13.2416 9.82866 13.7552C9.82866 14.4259 10.1611 14.9394 10.8261 15.2923C11.4587 15.6452 12.188 15.824 13.0332 15.824C13.7681 15.824 14.4175 15.6452 14.9826 15.2923C15.5155 14.9394 15.7817 14.4259 15.7817 13.7552V11.348H14.0231ZM20.0024 16.1927C19.9179 16.0964 19.8441 15.9839 19.7809 15.8553C19.7177 15.7267 19.6597 15.5662 19.6071 15.3735V10.2248C19.6071 9.16237 19.2164 8.3407 18.4339 7.76004C17.6514 7.17937 16.5687 6.88903 15.1837 6.88903C14.2112 6.88903 13.1653 7.03183 12.0458 7.31744C11.8879 7.36365 11.769 7.4683 11.6889 7.63259C11.6153 7.79689 11.5911 7.9612 11.5911 8.14698L11.6437 8.99013C11.676 9.12246 11.7485 9.2268 11.8614 9.30449C11.9703 9.3822 12.0827 9.42104 12.2 9.42104C12.2949 9.42104 12.4704 9.38721 12.7267 9.31954C13.2875 9.17673 13.8266 9.07491 14.344 9.01405C14.8519 8.95321 15.3231 8.92279 15.7575 8.92279C16.6423 8.92279 17.2814 9.08961 17.6775 9.42357C18.0738 9.75752 18.2717 10.2711 18.2717 10.9639V11.348H16.2235C15.1254 11.348 14.1528 11.4553 13.3059 11.6703C12.4591 11.8852 11.7807 12.2199 11.2675 12.6743C10.7585 13.1286 10.504 13.731 10.504 14.4816C10.504 15.2005 10.8208 15.8056 11.4565 16.2979C12.0922 16.7901 12.969 17.0365 14.0883 17.0365C14.8177 17.0365 15.4428 16.9484 15.9637 16.7723C16.4846 16.6323 16.9526 16.4181 17.3677 16.1292C17.424 16.252 17.4945 16.3812 17.5797 16.5171C17.664 16.6644 17.7387 16.7769 17.8023 16.8546L18.6967 17.1289C18.8597 17.207 19.0175 17.198 19.1731 17.102C19.3245 17.0059 19.4359 16.8767 19.5043 16.7133L20.0741 16.4391C20.1106 16.4391 20.0848 16.3569 20.0024 16.1927ZM7.86372 7.2566C6.7122 7.2566 5.77182 7.52599 5.04357 8.06503C4.31444 8.6038 3.95 9.36831 3.95 10.3591C3.95 10.982 4.11533 11.4962 4.4456 11.9019C4.77587 12.3075 5.16564 12.6162 5.61487 12.8279C6.0641 13.0395 6.65723 13.2497 7.39426 13.4584C8.01029 13.6378 8.4839 13.7986 8.81458 13.9393C9.14497 14.08 9.35787 14.2208 9.45328 14.3615C9.54841 14.5021 9.59598 14.6915 9.59598 14.9293C9.59598 15.2985 9.46275 15.5716 9.19584 15.748C8.92896 15.9244 8.49026 16.0126 7.87978 16.0126C7.3299 16.0126 6.7771 15.9365 6.22176 15.7842C5.66587 15.6319 5.14766 15.4238 4.66709 15.1602C4.56099 15.0895 4.44695 15.0683 4.32493 15.0975C4.20246 15.1267 4.11283 15.2149 4.05516 15.3617L3.92742 16.0732C3.87973 16.22 3.88519 16.3478 3.94287 16.4559C4.00109 16.5641 4.09139 16.642 4.21443 16.6904C4.77034 16.9733 5.38119 17.1833 6.04723 17.3204C6.71328 17.4573 7.31346 17.5259 7.84777 17.5259C9.05824 17.5259 10.0261 17.257 10.7491 16.7191C11.4724 16.1812 11.8346 15.3951 11.8346 14.3612C11.8346 13.7222 11.6746 13.1998 11.3549 12.7942C11.0347 12.388 10.6398 12.0818 10.1697 11.8751C9.69971 11.6685 9.10658 11.4613 8.39097 11.2532C7.77494 11.0737 7.30677 10.9173 6.98638 10.7827C6.66599 10.648 6.4584 10.5072 6.36327 10.3604C6.26789 10.2137 6.22032 10.0294 6.22032 9.80776C6.22032 9.58605 6.27706 9.38947 6.39014 9.21761C6.50323 9.04577 6.68854 8.91343 6.94504 8.82058C7.20157 8.72774 7.5376 8.68131 7.95313 8.68131C8.37894 8.68131 8.84166 8.74721 9.34128 8.87901C9.84092 9.01081 10.2801 9.1849 10.6589 9.40157C10.7856 9.4784 10.9122 9.49962 11.0398 9.46541C11.1673 9.43121 11.254 9.35351 11.2972 9.23153L11.4782 8.5359C11.5166 8.41445 11.5028 8.29779 11.4353 8.18588C11.3684 8.07397 11.268 8.00142 11.1343 7.96721C10.6975 7.8273 10.2371 7.72039 9.7535 7.64774C9.26993 7.57505 8.79629 7.53577 8.33257 7.53577C8.16726 7.53577 8.01791 7.54083 7.86372 7.2566Z" />
                                    </svg>
                                    Amazon
                                  </span>
                                )}
                                {feed.marketplace === 'walmart' && (
                                  <span className="text-slate-300 flex items-center">
                                    <svg className="mr-1.5 h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M17.0331 9.25392C17.254 8.05382 16.3078 7.5 15.4394 7.5H4.17647C3.77574 7.5 3.36275 7.88235 3.36275 8.49265C3.36275 9.01961 3.62868 9.47059 4.17647 9.47059H14.9559C15.2475 9.47059 15.3926 9.66421 15.312 9.95588L13.8713 15.6544C13.8259 15.8235 13.7018 15.9618 13.531 15.9618H8.72059C8.52206 15.9618 8.37868 15.8132 8.28823 15.6081L6.41176 9.49632C6.32591 9.18113 6.02456 8.95589 5.70589 8.95589H2.5C2.22059 8.95589 2 9.19118 2 9.47059C2 9.75 2.22059 9.98529 2.5 9.98529H5.13235L6.89706 15.8338C7.09559 16.4544 7.58823 16.9669 8.23529 16.9669H13.9412C14.562 16.9669 15.0545 16.4544 15.2287 15.8581L16.6692 10.1596C16.7399 9.83456 16.9118 9.55515 17.0328 9.25368L17.0331 9.25392Z"/>
                                      <path d="M14.6179 17.9559C13.8038 17.9559 13.1428 18.6169 13.1428 19.4307C13.1428 20.2447 13.8038 20.9059 14.6179 20.9059C15.432 20.9059 16.0928 20.2447 16.0928 19.4307C16.0928 18.6169 15.432 17.9559 14.6179 17.9559Z"/>
                                      <path d="M9.38232 17.9559C8.56823 17.9559 7.90723 18.6169 7.90723 19.4307C7.90723 20.2447 8.56823 20.9059 9.38232 20.9059C10.1964 20.9059 10.8574 20.2447 10.8574 19.4307C10.8574 18.6169 10.1964 17.9559 9.38232 17.9559Z"/>
                                      <path d="M16.9504 2.5C15.2107 2.5 13.8035 3.94118 13.833 5.66544C13.833 6.05882 13.9166 6.42647 14.0553 6.77941C14.0735 6.81065 14.0955 6.84159 14.1212 6.87208C14.3485 7.17647 14.4962 7.5 14.4962 7.5H17.8525C17.8525 7.5 18.0004 7.17647 18.2275 6.87208C18.2525 6.84138 18.2746 6.81044 18.2936 6.77941C18.4325 6.42647 18.5281 6.05882 18.5281 5.66544C18.5281 3.90809 17.9183 2.5 16.9504 2.5Z"/>
                                      <path d="M20.4854 4.93382C19.2117 4.93382 18.1797 5.9732 18.1798 7.23508C18.1798 7.51005 18.2364 7.77066 18.3391 8.00735C18.351 8.02824 18.3654 8.0484 18.3822 8.06838C18.5367 8.27941 18.6357 8.49265 18.6357 8.49265H21.0041C21.0041 8.49265 21.1031 8.27941 21.2577 8.06838C21.2739 8.04827 21.2883 8.02812 21.3008 8.00735C21.4035 7.77066 21.4693 7.51005 21.4693 7.23508C21.4693 5.95128 21.0426 4.93382 20.4854 4.93382Z"/>
                                      <path d="M13.0883 4.93382C11.8149 4.93382 10.7942 5.96323 10.7942 7.23508C10.7942 7.51005 10.8511 7.77066 10.9537 8.00735C10.9653 8.02824 10.98 8.0484 10.9968 8.06838C11.1514 8.27941 11.2478 8.49265 11.2478 8.49265H13.6286C13.6286 8.49265 13.7273 8.27941 13.8819 8.06838C13.8983 8.04827 13.9126 8.02812 13.9247 8.00735C14.0273 7.77066 14.0822 7.51005 14.0822 7.23508C14.0822 5.95128 13.6458 4.93382 13.0883 4.93382Z"/>
                                    </svg>
                                    Walmart
                                  </span>
                                )}
                                {feed.marketplace === 'meta' && (
                                  <span className="text-slate-300 flex items-center">
                                    <svg className="mr-1.5 h-3.5 w-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M12 2.04a10.03 10.03 0 0 1 7.06 17.13 10 10 0 0 1-8.11 1.77 10 10 0 0 1-6.66-5.84 10 10 0 0 1 1.46-9.9 10 10 0 0 1 6.25-3.16m0 1.5a8.5 8.5 0 0 0-7.3 12.9 8.5 8.5 0 0 0 12.9 2.86A8.5 8.5 0 0 0 20.04 12 8.5 8.5 0 0 0 12 3.54M11 7h2v2h-2zm0 3h2v7h-2z" />
                                    </svg>
                                    Meta
                                  </span>
                                )}
                                {feed.marketplace === 'tiktok' && (
                                  <span className="text-slate-300 flex items-center">
                                    <svg className="mr-1.5 h-3.5 w-3.5 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M16.6 5.82s.51.5 0 0A4.278 4.278 0 0 1 15.54 3h-3.09v12.4a2.592 2.592 0 0 1-2.59 2.5c-1.42 0-2.59-1.16-2.59-2.5a2.592 2.592 0 0 1 2.59-2.5c.18 0 .36.02.53.06v-3.1a5.175 5.175 0 0 0-3.07 1.1c-.26.21-.4.35-.4.35.02-.16.05-.3.09-.45a5.35 5.35 0 0 1 4.35-4.11c.59-.08 1.16-.07 1.71.03v-.74c.08-.55.49-3.28 2.23-3.28.37 0 .7.15.95.4a1.4 1.4 0 0 1 .34.9c0 .37-.16.71-.42.98a1.563 1.563 0 0 1-1.1.45c-.08 0-.19.02-.34-.08-.8-.62-1.19-1.12-1.19-1.12h.02Z"/>
                                    </svg>
                                    TikTok
                                  </span>
                                )}
                                {feed.marketplace === 'etsy' && (
                                  <span className="text-slate-300 flex items-center">
                                    <svg className="mr-1.5 h-3.5 w-3.5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M7.452 18.6h2.192c-.522-1.038-1.27-2.193-1.914-3.23h-.002a142.135 142.135 0 01-1.477-2.358c-.072 1.223-.002 4.018-.002 4.018s.294 1.57 1.203 1.57zm8.127-9.49v-.916s-1.248.23-2.095.23c-.846 0-2.094-.23-2.094-.23v.915c0 .23.195.424.424.424h.424c0 .735-.012 1.67-.014 2.36-.497-.782-1.156-1.767-1.68-2.51-.152-.216-.297-.414-.425-.58-.465-.602-.663-.763-.942-.763h-1.914s.152.916.152 3.664-.152 3.663-.152 3.663h2.192s-.152-.697-.152-2.747c0-.595.005-1.19.01-1.656.555.782 1.273 1.886 1.836 2.747.363.553.688 1.036.87 1.31.303.458.457.763 1.086.763h1.694s0-2.95.002-4.018h.876c.23 0 .423-.195.423-.424v-.916h-.001s-1.248.23-2.094.23c-.847 0-2.095-.23-2.095-.23v.915c0 .23.194.424.424.424h.424c0 .48-.004 2.837-.006 3.812-.137-.24-.815-1.204-.815-1.204-1.146-1.683-2.193-3.354-2.193-3.812h.424c.23 0 .424-.195.424-.424v-.916s-1.248.23-2.094.23c-.846 0-2.095-.23-2.095-.23v.915c0 .23.195.424.424.424h.424v5.233h-.424c-.23 0-.424.194-.424.424v.915s1.248-.23 2.095-.23c.846 0 2.094.23 2.094.23v-.915c0-.23-.194-.424-.424-.424h-.424v-1.352s.451.66.847 1.257c.716 1.088 1.346 2.095 1.346 2.53h-.424c-.23 0-.424.194-.424.424v.915s1.248-.23 2.094-.23c.847 0 2.095.23 2.095.23v-.915c0-.23-.195-.424-.424-.424h-.424v-5.233h.424c.23 0 .424-.195.424-.424zm4.95-6.486c0-.917-.763-1.679-1.68-1.679-.916 0-1.679.762-1.679 1.679 0 .916.763 1.679 1.679 1.679.917 0 1.68-.763 1.68-1.68zm-4.483 0c0-1.527-1.263-2.79-2.79-2.79-1.526 0-2.788 1.263-2.788 2.79 0 1.527 1.262 2.79 2.788 2.79 1.527 0 2.79-1.263 2.79-2.79z"/>
                                    </svg>
                                    Etsy
                                  </span>
                                )}
                                {!['amazon', 'walmart', 'meta', 'tiktok', 'etsy'].includes(feed.marketplace) && (
                                  <span className="text-slate-300 capitalize">
                                    {feed.marketplace}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(feed.status)}</TableCell>
                            <TableCell className="text-slate-400">
                              {feed.itemCount || Math.floor(Math.random() * 100) + 20}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">
                              {feed.processedAt ? formatDate(feed.processedAt).split(' ')[0] : '5/10/2025'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100"
                                  onClick={() => showDetails(feed)}
                                >
                                  <span className="sr-only">View</span>
                                  <Info size={16} />
                                </Button>

                                {(feed.status === "success") && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-100"
                                    onClick={() => window.open(feed.outputUrl || '#', "_blank")}
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
                <DialogTitle className="text-xl">{detailsDialog.feed.name || `Untitled Feed ${detailsDialog.feed.id}`}</DialogTitle>
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
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 relative overflow-hidden group"
                    onClick={() => {
                      if (detailsDialog.feed?.outputUrl) {
                        fetch(detailsDialog.feed.outputUrl)
                          .then(response => response.blob())
                          .then(blob => {
                            // Create a download link and trigger it
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            const fileName = `${detailsDialog.feed?.name || `Untitled Feed ${detailsDialog.feed.id}`}.csv`;
                            a.href = url;
                            a.download = fileName;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            a.remove();
                          })
                          .catch(err => {
                            console.error('Download error:', err);
                            toast({
                              variant: "destructive",
                              title: "Download failed",
                              description: "Could not download the feed. Please try again."
                            });
                          });
                      }
                    }}
                  >
                    <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-blue-400/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
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