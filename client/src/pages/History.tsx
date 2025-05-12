import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Download, 
  MoreHorizontal, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Ban,
  FileText 
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function History() {
  const { toast } = useToast();
  
  const { data: feeds, isLoading, error } = useQuery({
    queryKey: ["/api/feeds"],
  });

  const handleDownload = async (feedId: number) => {
    try {
      window.location.href = `/api/feeds/${feedId}/download`;
      
      toast({
        title: "Download started",
        description: "Your feed is being downloaded..."
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "There was a problem downloading your feed. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'cancelled':
        return <Ban className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };
  
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'failed':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'cancelled':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Transformation History</h1>
          <p className="text-muted-foreground">View and manage your past feed transformations</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Feed Transformations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : error ? (
            <div className="flex justify-center items-center p-8 text-center">
              <div>
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-gray-400">Failed to load feed history</p>
              </div>
            </div>
          ) : feeds && feeds.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeds.map((feed: any) => (
                    <TableRow key={feed.id}>
                      <TableCell className="font-medium">{feed.name}</TableCell>
                      <TableCell>
                        <span className="capitalize">{feed.marketplace}</span>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusClass(feed.status)}`}>
                          {getStatusIcon(feed.status)}
                          <span className="ml-1 capitalize">{feed.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(feed.createdAt || feed.processedAt)}</TableCell>
                      <TableCell>{feed.itemCount || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => handleDownload(feed.id)}
                              disabled={feed.status !== 'completed'}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex justify-center items-center p-8 text-center">
              <div>
                <FileText className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-gray-400">No transformation history yet</p>
                <Button className="mt-4" onClick={() => window.location.href = "/new-feed"}>
                  Create your first feed
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        {feeds && feeds.length > 0 && (
          <CardFooter className="flex justify-center border-t p-4">
            <Button variant="outline">Load More</Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}