import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Filter feeds based on active tab and ensure feed names are displayed
  const filteredFeeds = (activeTab === "all" 
    ? sortedFeeds 
    : sortedFeeds.filter((feed) => feed.marketplace === activeTab))
    // Make sure all feeds have a display name
    .map(feed => ({
      ...feed,
      name: feed.name && feed.name.trim() !== "" ? feed.name : `Untitled Feed ${feed.id}`
    }));

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

  // Function to get marketplace icon
  const getMarketplaceIcon = (marketplace: string) => {
    switch (marketplace.toLowerCase()) {
      case 'amazon':
        return (
          <span className="text-slate-300 flex items-center">
            <svg className="mr-1.5 h-3.5 w-3.5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14.0231 11.348C13.1458 11.348 12.4323 11.4122 11.8826 11.5406C11.1691 11.7011 10.6621 11.99 10.3084 12.4072C9.98856 12.7923 9.82866 13.2416 9.82866 13.7552C9.82866 14.4259 10.1611 14.9394 10.8261 15.2923C11.4587 15.6452 12.188 15.824 13.0332 15.824C13.7681 15.824 14.4175 15.6452 14.9826 15.2923C15.5155 14.9394 15.7817 14.4259 15.7817 13.7552V11.348H14.0231ZM20.0024 16.1927C19.9179 16.0964 19.8441 15.9839 19.7809 15.8553C19.7177 15.7267 19.6597 15.5662 19.6071 15.3735V10.2248C19.6071 9.16237 19.2164 8.3407 18.4339 7.76004C17.6514 7.17937 16.5687 6.88903 15.1837 6.88903C14.2112 6.88903 13.1653 7.03183 12.0458 7.31744C11.8879 7.36365 11.769 7.4683 11.6889 7.63259C11.6153 7.79689 11.5911 7.9612 11.5911 8.14698L11.6437 8.99013C11.676 9.12246 11.7485 9.2268 11.8614 9.30449C11.9703 9.3822 12.0827 9.42104 12.2 9.42104C12.2949 9.42104 12.4704 9.38721 12.7267 9.31954C13.2875 9.17673 13.8266 9.07491 14.344 9.01405C14.8519 8.95321 15.3231 8.92279 15.7575 8.92279C16.6423 8.92279 17.2814 9.08961 17.6775 9.42357C18.0738 9.75752 18.2717 10.2711 18.2717 10.9639V11.348H16.2235C15.1254 11.348 14.1528 11.4553 13.3059 11.6703C12.4591 11.8852 11.7807 12.2199 11.2675 12.6743C10.7585 13.1286 10.504 13.731 10.504 14.4816C10.504 15.2005 10.8208 15.8056 11.4565 16.2979C12.0922 16.7901 12.969 17.0365 14.0883 17.0365C14.8177 17.0365 15.4428 16.9484 15.9637 16.7723C16.4846 16.6323 16.9526 16.4181 17.3677 16.1292C17.424 16.252 17.4945 16.3812 17.5797 16.5171C17.664 16.6644 17.7387 16.7769 17.8023 16.8546L18.6967 17.1289C18.8597 17.207 19.0175 17.198 19.1731 17.102C19.3245 17.0059 19.4359 16.8767 19.5043 16.7133L20.0741 16.4391C20.1106 16.4391 20.0848 16.3569 20.0024 16.1927ZM7.86372 7.2566C6.7122 7.2566 5.77182 7.52599 5.04357 8.06503C4.31444 8.6038 3.95 9.36831 3.95 10.3591C3.95 10.982 4.11533 11.4962 4.4456 11.9019C4.77587 12.3075 5.16564 12.6162 5.61487 12.8279C6.0641 13.0395 6.65723 13.2497 7.39426 13.4584C8.01029 13.6378 8.4839 13.7986 8.81458 13.9393C9.14497 14.08 9.35787 14.2208 9.45328 14.3615C9.54841 14.5021 9.59598 14.6915 9.59598 14.9293C9.59598 15.2985 9.46275 15.5716 9.19584 15.748C8.92896 15.9244 8.49026 16.0126 7.87978 16.0126C7.3299 16.0126 6.7771 15.9365 6.22176 15.7842C5.66587 15.6319 5.14766 15.4238 4.66709 15.1602C4.56099 15.0895 4.44695 15.0683 4.32493 15.0975C4.20246 15.1267 4.11283 15.2149 4.05516 15.3617L3.92742 16.0732C3.87973 16.22 3.88519 16.3478 3.94287 16.4559C4.00109 16.5641 4.09139 16.642 4.21443 16.6904C4.77034 16.9733 5.38119 17.1833 6.04723 17.3204C6.71328 17.4573 7.31346 17.5259 7.84777 17.5259C9.05824 17.5259 10.0261 17.257 10.7491 16.7191C11.4724 16.1812 11.8346 15.3951 11.8346 14.3612C11.8346 13.7222 11.6746 13.1998 11.3549 12.7942C11.0347 12.388 10.6398 12.0818 10.1697 11.8751C9.69971 11.6685 9.10658 11.4613 8.39097 11.2532C7.77494 11.0737 7.30677 10.9173 6.98638 10.7827C6.66599 10.648 6.4584 10.5072 6.36327 10.3604C6.26789 10.2137 6.22032 10.0294 6.22032 9.80776C6.22032 9.58605 6.27706 9.38947 6.39014 9.21761C6.50323 9.04577 6.68854 8.91343 6.94504 8.82058C7.20157 8.72774 7.5376 8.68131 7.95313 8.68131C8.37894 8.68131 8.84166 8.74721 9.34128 8.87901C9.84092 9.01081 10.2801 9.1849 10.6589 9.40157C10.7856 9.4784 10.9122 9.49962 11.0398 9.46541C11.1673 9.43121 11.254 9.35351 11.2972 9.23153L11.4782 8.5359C11.5166 8.41445 11.5028 8.29779 11.4353 8.18588C11.3684 8.07397 11.268 8.00142 11.1343 7.96721C10.6975 7.8273 10.2371 7.72039 9.7535 7.64774C9.26993 7.57505 8.79629 7.53577 8.33257 7.53577C8.16726 7.53577 8.01791 7.54083 7.86372 7.2566Z" />
            </svg>
            Amazon
          </span>
        );
      case 'walmart':
        return (
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
        );
      case 'meta':
        return (
          <span className="text-slate-300 flex items-center">
            <svg className="mr-1.5 h-3.5 w-3.5 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.04a10.03 10.03 0 0 1 7.06 17.13 10 10 0 0 1-8.11 1.77 10 10 0 0 1-6.66-5.84 10 10 0 0 1 1.46-9.9 10 10 0 0 1 6.25-3.16m0 1.5a8.5 8.5 0 0 0-7.3 12.9 8.5 8.5 0 0 0 12.9 2.86A8.5 8.5 0 0 0 20.04 12 8.5 8.5 0 0 0 12 3.54M11 7h2v2h-2zm0 3h2v7h-2z" />
            </svg>
            Meta
          </span>
        );
      case 'tiktok':
        return (
          <span className="text-slate-300 flex items-center">
            <svg className="mr-1.5 h-3.5 w-3.5 text-pink-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>
            TikTok
          </span>
        );
      case 'catch':
        return (
          <span className="text-slate-300 flex items-center">
            <svg className="mr-1.5 h-3.5 w-3.5 text-teal-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
            </svg>
            Catch
          </span>
        );
      case 'etsy':
        return (
          <span className="text-slate-300 flex items-center">
            <svg className="mr-1.5 h-3.5 w-3.5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8.56 20.43c-.15-.26 0-.59.45-.79.55-.26 1.77-.75 3.13-1.42.19.38.37.77.59 1.19-.89.46-2.03.97-3.47 1.25-.53.12-.56.03-.7-.23zm11.35-10.43c-.44.53-1.35 1.02-2.52 1.52-.65-1.91-1.53-3.8-1.07-7.3.14-1.09-.63-1.38-1.05-1.39-.38 0-1.22.69-1.25 1.79-.03 2.02.9 4.27 1.41 7.1c-.65.3-1.38.61-2.14.91c-.25.1-.44.19-.65.29c-.3.13-.61.28-.94.43c-.51-1.02-1.04-2.83-1.18-4.88c-.08-1.22-.33-3.28-2.1-3.21c-1.51.06-1.16 2.06-1.16 2.06c.36 2.26 1.14 3.97 1.39 5.38c-.94.42-1.49.66-2.46 1.04c-.42.16-.71.29-.95.4c-.49-1.16-1.06-3.26-.65-5.19c.13-.6-.43-.85-.77-.86c-.9-.03-1.18.86-1.27 1.42c-.09.71.2 2.45.71 3.97c-1.03.44-2.25.93-3.09 1.25c-.49.17-1.09.39-1.51.55c-.1-1.46-.11-3.4.61-6.02c1.4-5.06 7.12-5.46 8.88-5.69c2.19-.3 5.85 1.2 7.09 4.42c1.61 4.19-2.77 7.97-4.95 9.99c-2.2 2.04-5.03 3.85-7.46 3.99c-2.36.18-3.83-1.69-3.88-1.74c-.51-.54-.84-.93-.01-1.78c.38-.39 6.12-5.36 7.39-6.57c.3.98.76 2.09 1.17 3.06c-1.58 1.4-4.27 3.79-4.81 4.31c-.5.26-.64.57-.14.84c.48.25 1.35.52 2.29.45c1.21-.1 2.93-.61 4.3-1.42c.12.38.27.82.4 1.19c.43 1.1.65 1.82.44 2.67c-.11.47-.28.94-.91 1.29c-1.55.88-2.4.2-2.62-.23c-.28-.52-.05-1.1.26-1.37c.3-.25.53-.06.74.09c.16.12.23.25.21.29c-.11.11-.76-.35-.8.16c-.01.27.5.37.95.09c.39-.24.3-.72.29-.94c-.07-.64-.7-.97-1.31-.58c-.57.36-.68 1.14-.49 1.7c.28.82 1.43 1.01 2.31.69c1.59-.57 1.61-2 1.43-2.88c-.06-.27-.15-.57-.24-.88c1.71-1.05 3.94-2.97 5.2-4.61c1.32.66 2.88 1.98 3.38 4.05c.4 1.63.16 3.42-2.06 3.63c-1.39.13-1.96-.54-2.15-.96c-.27-.6-.02-1.2.27-1.46c.69-.61 1.3-.27 1.36-.07c.03.09-.44.3-.13.72c.09.13.37.24.74.02c.53-.33.51-.9.45-1.13c-.27-.95-1.94-.73-2.07.36c-.13 1.09.91 2.1 2.18 2.1c2.5.05 3.63-1.91 3.48-3.4c-.16-1.47-1.05-2.93-2.48-4c.64-1.01 1.99-3.63 1.54-6.97c-.24-1.79-1.13-3.25-1.95-3.77c-.42-.27-.92-.24-1.05.16c-.07.23.05.48.35.89c1.1 1.51.61 3.89.19 5.19c-.43 1.34-.93 2.17-1.32 2.75c-.35-1.67-1.28-3.28-3.3-4.04c-.52-2.08-2.64-2.87-4.67-2.92c-2.51-.04-5.11.69-7.26 2.41c-1.1.88-1.88 1.49-2.4 2.85c-.48 1.25-.2 2.72.06 3.63c-.57.32-1.35.82-1.92 1.19c-2.2 1.45-3.53 2.43-3.2 4.03c.24 1.14 1.45 1.69 2.1 1.7c1.56.06 2.68-.69 3.77-2.18c.63-.86 1.16-1.94 1.63-3.19c1.69-.76 4.66-2.05 7.09-3.07c.05 2.52 1.45 4.68 2.16 5.62c-.54.26-1.12.53-1.64.78c-1.15.55-2.19 1.05-2.89 1.43c-.58.32-1.18.74-1.2 1.34c-.04.99 1.11 1.32 1.57 1.35c.79.04 1.65-.33 1.96-.56c.61-.44 1.06-1.07 1.41-1.84c.22-.5.42-1.16.63-1.97c1.68-.8 3.75-1.68 6.01-2.63c1.03 1.93 2.67 3.96 3.86 4.88c.19.15.35.08.29-.12c-.73-2.78-1.27-4.27-1.44-7.48c.95-.49 1.61-.9 2.34-1.05c.28-.06.57.02.5.29c-.48 1.93-.29 3.67.12 5.05c.13.44.53.56.95.44c.83-.25 1.32-.86 1.43-1.86c.1-.93-.23-1.77-.57-2.7c.8-.66 1.64-1.17 2.28-1.3c.28-.06.55.04.46.31c-.31 1.01-.35 2.06-.13 2.78c.15.5.35.75.67.76c.73.01 1.45-.95 1.5-2.14c.06-1.71-1.43-2.75-3.02-2.75c-1.42 0-2.59.58-3.74 1.26c-.05-.52-.2-1.09-.43-1.76c.66-.59 1.24-1.09 1.74-1.51c.97-.82 1.56-1.3 1.69-1.45c.46-.52.92-1.22.86-2.07c-.1-1.27-1.66-1.59-2.1-1.55c-1.24.1-2.3 1.03-2.7 1.92c-.36.83-.44 1.7-.47 2.37c0 .11-.02.27-.03.46c-1.27 1.05-2.97 2.47-4.05 3.34c-.03-1.37-.09-2.59-.21-3.76c-.01-.13-.03-.26-.04-.39c.77-.51 1.25-.89 1.25-.89c.7-.54 2.01-1.64 1.81-3.16c-.08-.62-.56-1.13-1.27-1.33c-1.28-.35-2.3.12-3.5.87c-1.17.73-2.21 2.7-2.21 2.7c-.03.05-.12.35-.26.88c-2.75 1.17-6.03 2.67-6.73 3.03c-1.7.88-2.9 1.64-3.88 2.45c-.1-.27-.22-.54-.33-.85c-.65-1.74-1.06-3.58-.95-4.97c.1-1.25.42-2.35 1.73-4.23c.61-.88 4.72-4.13 9.42-4.07c2.2.03 4.76.4 6.38 2.07c1 1.03 1.59 2.19 1.8 3.58c.2 1.36-.04 2.4-.42 3.31c-.17.05-.37.14-.58.22c-2.83 1.1-4.75 2.5-4.75 2.5c-.04.03-.08.05-.12.08c.04-1.17.33-2.64.84-3.95c.46-1.14 1.06-2.27 1.84-3.1c.11-.12.16-.15.03-.14c-.41.01-1.55.24-2.02.37c-3.31.97-6.62 3.64-6.9 3.8c-1.02.56-2.29 1.3-3.93 2.2c-.01-.18-.06-.37-.06-.57c.02-2.98 1.81-5.71 4.45-7.31c3.34-2.05 8.09-2.39 10.7-1.5c.01 0 .02 0 .02-.01c0-.01-.01-.02-.02-.02c-2.2-1.87-7.59-2.55-11.43.08c-3.08 2.08-4.62 5.15-4.64 8.12c-.51.3-1.08.63-1.72 1.01c-5.11 3.02-10.52 6.26-10.37 14.74c-.47-.17-.8-.59-.8-.59c-1.36-2.32.16-5.73 1.13-7.13c1.5-2.16 3.78-4.5 7.55-6.79c4.06-2.47 11.86-5.88 11.86-5.88"></path>
            </svg>
            Etsy
          </span>
        );
      case 'reebelo':
        return (
          <span className="text-slate-300 flex items-center">
            <svg className="mr-1.5 h-3.5 w-3.5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5,3.5L18,2l-1.5,1.5L15,2l-1.5,1.5L12,2l-1.5,1.5L9,2L7.5,3.5L6,2v14H3v3c0,1.66,1.34,3,3,3h12c1.66,0,3-1.34,3-3V2 L19.5,3.5z M15,20H6c-0.55,0-1-0.45-1-1v-1h10V20z M19,19c0,0.55-0.45,1-1,1s-1-0.45-1-1v-3H8V5h11V19z M15,7v2h-4V7H15z M15,11v2h-4v-2H15z M8,9V7h2v2H8z M8,13v-2h2v2H8z"></path>
            </svg>
            Reebelo
          </span>
        );
      default:
        return <span className="capitalize">{marketplace}</span>;
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