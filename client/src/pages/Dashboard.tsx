import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Eye, Download, Copy, FileWarning, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ChartPlaceholder from "@/components/ChartPlaceholder";
import { Feed } from "@shared/schema";

export default function Dashboard() {
  // Fetch feeds for the dashboard
  const { data: feeds, isLoading } = useQuery<Feed[]>({
    queryKey: ['/api/feeds'],
    staleTime: 60000,
  });

  // Calculate dashboard stats
  const activeFeeds = feeds?.filter(f => f.status === 'completed').length || 0;
  const totalItems = feeds?.reduce((sum, feed) => sum + (feed.itemCount || 0), 0) || 0;
  const aiCorrections = feeds?.reduce((sum, feed) => {
    if (feed.aiChanges) {
      const changes = feed.aiChanges as any;
      return sum + (
        (changes.titleOptimized || 0) + 
        (changes.categoryCorrected || 0) + 
        (changes.descriptionEnhanced || 0) + 
        (changes.pricingFixed || 0)
      );
    }
    return sum;
  }, 0) || 0;

  const latestFeeds = feeds?.slice(0, 4) || [];

  // Helper to generate status badge
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
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Analytics Card 1 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Active Feeds</h3>
              <span className="text-primary"><LayoutDashboardIcon className="h-5 w-5" /></span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-3xl font-bold">{activeFeeds}</p>
                <p className="text-gray-500 text-sm mt-2">Last updated: Today at {new Date().toLocaleTimeString()}</p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Analytics Card 2 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Processed Items</h3>
              <span className="text-cyan-600"><LayersIcon className="h-5 w-5" /></span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <p className="text-3xl font-bold">{totalItems.toLocaleString()}</p>
                <p className="text-green-500 text-sm mt-2">+{Math.floor(totalItems * 0.1).toLocaleString()} from last week</p>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Analytics Card 3 */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">AI Corrections</h3>
              <span className="text-orange-500"><SparklesIcon className="h-5 w-5" /></span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <p className="text-3xl font-bold">{aiCorrections.toLocaleString()}</p>
                <p className="text-gray-500 text-sm mt-2">Improved data quality by 87%</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Recent Activity */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Feed Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Marketplace</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-muted">
              {isLoading ? (
                Array(4).fill(0).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-20" />
                    </td>
                  </tr>
                ))
              ) : latestFeeds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No feeds found. Create a new feed to get started.
                  </td>
                </tr>
              ) : (
                latestFeeds.map((feed) => (
                  <tr key={feed.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{feed.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500 capitalize">{feed.marketplace}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(feed.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(feed.processedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {feed.status === 'completed' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {feed.status === 'failed' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                            <FileWarning className="h-4 w-4" />
                          </Button>
                        )}
                        {feed.status === 'failed' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        {feed.status === 'completed' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Copy className="h-4 w-4" />
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
      </Card>

      {/* Marketplace Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Marketplace Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Marketplace Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartPlaceholder 
              type="pie" 
              text="Marketplace distribution chart" 
              height="h-64"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-primary mr-2"></div>
                <span className="text-sm">Amazon (45%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-cyan-600 mr-2"></div>
                <span className="text-sm">Walmart (25%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-orange-500 mr-2"></div>
                <span className="text-sm">Meta (15%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-500 mr-2"></div>
                <span className="text-sm">Others (15%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* AI Data Corrections */}
        <Card>
          <CardHeader>
            <CardTitle>AI Data Corrections</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartPlaceholder 
              type="bar" 
              text="Data correction statistics chart" 
              height="h-64"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">Title Optimization (38%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">Missing Data (22%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm">Category Corrections (25%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-primary/50 mr-2"></div>
                <span className="text-sm">Format Standardization (15%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Icons
function LayoutDashboardIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function LayersIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function SparklesIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
