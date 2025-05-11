import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { SiAmazon, SiWalmart, SiMeta, SiTiktok, SiEtsy, SiEbay, SiShopify } from "react-icons/si";

interface FeedExportProps {
  feedName: string;
  itemCount: number;
  categories: number;
  marketplace: string;
  onDownload: () => void;
  onSaveConfig: () => void;
  onBack: () => void;
}

export default function FeedExport({
  feedName,
  itemCount,
  categories,
  marketplace,
  onDownload,
  onSaveConfig,
  onBack
}: FeedExportProps) {
  const [exportOption, setExportOption] = useState("csv");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [frequency, setFrequency] = useState("daily");
  const [time, setTime] = useState("00:00");

  const getMarketplaceIcon = () => {
    switch (marketplace.toLowerCase()) {
      case 'amazon': return <SiAmazon className="h-6 w-6 mr-2" />;
      case 'walmart': return <SiWalmart className="h-6 w-6 mr-2" />;
      case 'meta': return <SiMeta className="h-6 w-6 mr-2" />;
      case 'tiktok': return <SiTiktok className="h-6 w-6 mr-2" />;
      case 'etsy': return <SiEtsy className="h-6 w-6 mr-2" />;
      case 'ebay': return <SiEbay className="h-6 w-6 mr-2" />;
      case 'shopify': return <SiShopify className="h-6 w-6 mr-2" />;
      default: return null;
    }
  };

  return (
    <div className="mb-6">
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center mb-4">
            {getMarketplaceIcon()}
            <h4 className="text-lg font-medium">{marketplace} Feed Ready</h4>
          </div>
          
          {/* Feed Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Products</p>
              <p className="text-xl font-semibold">{itemCount}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Categories</p>
              <p className="text-xl font-semibold">{categories}</p>
            </div>
            <div className="bg-muted/30 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Marketplace</p>
              <p className="text-xl font-semibold capitalize">{marketplace}</p>
            </div>
          </div>
          
          {/* Export Options */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-700 mb-3">Export Options</h5>
            <RadioGroup 
              value={exportOption} 
              onValueChange={setExportOption}
              className="space-y-3"
            >
              <div className="flex items-center p-3 border rounded-lg hover:bg-muted/10 cursor-pointer">
                <RadioGroupItem value="csv" id="exportCSV" className="mr-3" />
                <Label htmlFor="exportCSV" className="cursor-pointer flex-grow">
                  <div className="font-medium">Download as CSV</div>
                  <div className="text-sm text-muted-foreground">Standard comma-separated values file</div>
                </Label>
              </div>
              <div className="flex items-center p-3 border rounded-lg hover:bg-muted/10 cursor-pointer">
                <RadioGroupItem value="xlsx" id="exportXLS" className="mr-3" />
                <Label htmlFor="exportXLS" className="cursor-pointer flex-grow">
                  <div className="font-medium">Download as Excel (XLSX)</div>
                  <div className="text-sm text-muted-foreground">Microsoft Excel spreadsheet format</div>
                </Label>
              </div>
              <div className="flex items-center p-3 border rounded-lg hover:bg-muted/10 cursor-pointer">
                <RadioGroupItem value="direct" id="directUpload" className="mr-3" />
                <Label htmlFor="directUpload" className="cursor-pointer flex-grow">
                  <div className="font-medium">Direct Upload to {marketplace}</div>
                  <div className="text-sm text-muted-foreground">Requires {marketplace} connection</div>
                </Label>
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                  Premium
                </Badge>
              </div>
            </RadioGroup>
          </div>
          
          {/* Schedule Options */}
          <div className="mb-6">
            <h5 className="font-medium text-gray-700 mb-3">Schedule Updates</h5>
            <div className="bg-muted/20 p-4 rounded-lg">
              <div className="flex items-start mb-3">
                <Checkbox 
                  id="scheduleUpdates" 
                  checked={scheduleEnabled}
                  onCheckedChange={(checked) => setScheduleEnabled(checked === true)}
                  className="mt-1 mr-3" 
                />
                <div>
                  <Label htmlFor="scheduleUpdates" className="font-medium cursor-pointer">
                    Enable scheduled updates
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically refresh this feed from your data source
                  </p>
                </div>
              </div>
              
              {scheduleEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label 
                      htmlFor="frequency" 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Frequency
                    </Label>
                    <Select 
                      value={frequency} 
                      onValueChange={setFrequency}
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label 
                      htmlFor="time" 
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Time
                    </Label>
                    <Select 
                      value={time} 
                      onValueChange={setTime}
                    >
                      <SelectTrigger id="time">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="00:00">12:00 AM (Midnight)</SelectItem>
                        <SelectItem value="03:00">3:00 AM</SelectItem>
                        <SelectItem value="06:00">6:00 AM</SelectItem>
                        <SelectItem value="09:00">9:00 AM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:space-x-3">
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="border-primary text-primary hover:bg-primary/10"
                onClick={onSaveConfig}
              >
                Save Feed Configuration
              </Button>
              <Button onClick={onDownload}>
                Download Feed
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* What's Next Section */}
      <Card className="bg-primary-50 border-primary-200">
        <CardContent className="pt-6">
          <h4 className="text-lg font-medium text-primary-800 mb-3">What's Next?</h4>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="bg-primary-100 p-1.5 rounded-full text-primary mr-3 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                  <path d="M2 7h20" />
                  <path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
                  <path d="M6 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-primary-800">Connect to More Marketplaces</p>
                <p className="text-sm text-primary-600">
                  Generate feeds for Walmart, Meta, or other platforms
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-primary-100 p-1.5 rounded-full text-primary mr-3 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-primary-800">Create Custom Transformation Rules</p>
                <p className="text-sm text-primary-600">
                  Set specific rules for handling your product data
                </p>
              </div>
            </li>
            <li className="flex items-start">
              <div className="bg-primary-100 p-1.5 rounded-full text-primary mr-3 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-primary-800">Monitor Performance</p>
                <p className="text-sm text-primary-600">
                  Track your product performance across marketplaces
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
