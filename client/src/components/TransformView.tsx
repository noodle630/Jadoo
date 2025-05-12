import { useState } from "react";
import { CheckCircle2, FileText } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type TransformStatus = 'idle' | 'processing' | 'completed' | 'error';

interface TransformViewProps {
  feedData?: {
    uploadedFile: File | null;
    selectedMarketplace: string | null;
    feedName: string;
    lastUploadTime: Date | null;
  };
}

export default function TransformView({ feedData }: TransformViewProps) {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const [transformStatus, setTransformStatus] = useState<TransformStatus>('idle');
  const [transformProgress, setTransformProgress] = useState(0);
  const [transformResult, setTransformResult] = useState<{
    inputRows: number;
    outputRows: number;
    marketplace: string;
    downloadUrl: string;
  } | null>(null);
  
  // Mock data for available feeds
  const availableFeeds = [
    { id: '1', name: 'Electronics Inventory', rows: 245, lastUpdated: '2 hours ago' },
    { id: '2', name: 'Clothing Products', rows: 187, lastUpdated: '1 day ago' },
    { id: '3', name: 'Home Goods', rows: 319, lastUpdated: '3 days ago' },
  ];
  
  const handleStartTransform = async () => {
    if (!selectedFeed) return;
    
    setTransformStatus('processing');
    
    // Simulate transform progress
    const progressInterval = setInterval(() => {
      setTransformProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 10;
      });
    }, 500);
    
    try {
      // Simulate transform process
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      clearInterval(progressInterval);
      setTransformProgress(100);
      setTransformStatus('completed');
      
      // Mock result data
      setTransformResult({
        inputRows: 245,
        outputRows: 245, // 1:1 mapping maintained
        marketplace: 'Amazon',
        downloadUrl: '#',
      });
      
    } catch (error) {
      clearInterval(progressInterval);
      setTransformStatus('error');
    }
  };
  
  const resetTransform = () => {
    setSelectedFeed(null);
    setTransformStatus('idle');
    setTransformProgress(0);
    setTransformResult(null);
  };
  
  return (
    <div className="grid gap-4">
      {transformStatus === 'completed' && transformResult ? (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl">Transform Completed</CardTitle>
                <CardDescription>
                  Your product data has been successfully transformed
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={resetTransform}>
                New Transform
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-center mb-6">
                <div className="bg-green-900/30 border border-green-700 rounded-full p-4">
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400">Transformation Details</h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div className="text-gray-400">Input Rows</div>
                    <div>{transformResult.inputRows}</div>
                    <div className="text-gray-400">Output Rows</div>
                    <div>
                      {transformResult.outputRows}
                      {transformResult.inputRows === transformResult.outputRows && (
                        <span className="ml-2 text-green-500 text-xs">Perfect 1:1 mapping</span>
                      )}
                    </div>
                    <div className="text-gray-400">Marketplace</div>
                    <div>{transformResult.marketplace}</div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400">Download Options</h3>
                  <div className="space-y-3">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      Download CSV
                    </Button>
                    <Button variant="outline" className="w-full">
                      View Preview
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <CardTitle className="text-xl">Transform Feed</CardTitle>
            <CardDescription>
              Select a feed and apply intelligent transformation to your product data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedFeed && transformStatus === 'processing' ? (
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="text-center mb-6">
                  <div className="inline-block p-4 rounded-full bg-blue-900/20 mb-4">
                    <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium">Transforming Your Data</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Converting your product data to marketplace-ready format
                  </p>
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(transformProgress)}%</span>
                  </div>
                  <Progress value={transformProgress} className="h-2 bg-gray-700" />
                </div>
                
                <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 text-sm">
                  <p className="text-blue-300">
                    <strong>Note:</strong> This process ensures a perfect 1:1 mapping between your 
                    input data and the marketplace format, preserving every product entry.
                  </p>
                </div>
              </div>
            ) : selectedFeed ? (
              <div className="bg-gray-800 p-6 rounded-lg">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Selected Feed</h3>
                    <div className="flex items-center p-3 bg-gray-900 rounded-lg border border-gray-700">
                      <FileText className="h-5 w-5 text-blue-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium">
                          {availableFeeds.find(f => f.id === selectedFeed)?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {availableFeeds.find(f => f.id === selectedFeed)?.rows} rows
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">Target Marketplace</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {["Amazon", "Walmart", "Catch", "Meta", "TikTok", "Reebelo"].map((marketplace) => (
                        <div
                          key={marketplace}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            marketplace === "Amazon" 
                              ? "border-blue-500 bg-blue-900/20" 
                              : "border-gray-700 hover:border-blue-400 bg-gray-800/50"
                          }`}
                        >
                          <p className="text-sm font-medium">{marketplace}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-3">Advanced Options</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                        <p className="text-sm">Generate missing SKUs</p>
                        <div className="relative inline-flex h-4 w-9 items-center rounded-full bg-gray-700">
                          <span className="absolute mx-1 h-2 w-2 rounded-full bg-blue-500 transition-transform translate-x-4"></span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                        <p className="text-sm">Enhanced descriptions</p>
                        <div className="relative inline-flex h-4 w-9 items-center rounded-full bg-gray-700">
                          <span className="absolute mx-1 h-2 w-2 rounded-full bg-blue-500 transition-transform translate-x-4"></span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-700">
                        <p className="text-sm">Fix formatting issues</p>
                        <div className="relative inline-flex h-4 w-9 items-center rounded-full bg-blue-900">
                          <span className="absolute mx-1 h-2 w-2 rounded-full bg-blue-500 transition-transform translate-x-4"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={handleStartTransform}
                  >
                    Start Transformation
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <p className="text-sm text-gray-400 mb-4">
                  Select a feed to transform
                </p>
                <div className="space-y-3">
                  {availableFeeds.map(feed => (
                    <div 
                      key={feed.id}
                      className="p-3 border border-gray-700 rounded-lg flex justify-between items-center cursor-pointer hover:border-blue-500 transition-colors text-left"
                      onClick={() => setSelectedFeed(feed.id)}
                    >
                      <div className="flex items-center">
                        <div className="text-gray-200 mr-3">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{feed.name}</p>
                          <p className="text-xs text-gray-400">{feed.rows} rows · {feed.lastUpdated}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}