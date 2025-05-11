import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { SiAmazon, SiWalmart, SiMeta, SiTiktok } from "react-icons/si";
import { Crown } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  
  // User profile state
  const [fullName, setFullName] = useState("Sarah Chen");
  const [email, setEmail] = useState("sarah.chen@example.com");
  const [company, setCompany] = useState("Chen's Apparel");
  const [role, setRole] = useState("E-commerce Manager");
  
  // Marketplace connections state
  const [connections, setConnections] = useState({
    amazon: { connected: true, date: "Jul 12, 2023" },
    walmart: { connected: true, date: "Jul 15, 2023" },
    meta: { connected: false, date: "" },
    tiktok: { connected: false, date: "" },
  });
  
  // Notification preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(true);
  const [marketplaceUpdates, setMarketplaceUpdates] = useState(false);
  
  // AI processing settings
  const [aiProcessingLevel, setAiProcessingLevel] = useState("standard");
  const [defaultLanguage, setDefaultLanguage] = useState("en-US");
  const [autoCorrectSpelling, setAutoCorrectSpelling] = useState(true);
  const [enhanceDescriptions, setEnhanceDescriptions] = useState(true);
  const [categoryMapping, setCategoryMapping] = useState(true);
  
  // Fetch user data
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['/api/user'],
    staleTime: Infinity,
    onSuccess: (data) => {
      if (data) {
        setFullName(data.username || "");
        setEmail(data.email || "");
        setCompany(data.company || "");
        setRole(data.role || "");
      }
    }
  });
  
  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (userData: any) => {
      // In a real app, we would update the user data on the server
      return await new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000));
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save settings",
        description: "There was an error saving your settings.",
        variant: "destructive",
      });
    }
  });
  
  // Handle save settings
  const handleSaveSettings = () => {
    saveSettingsMutation.mutate({
      fullName,
      email,
      company,
      role,
      notifications: {
        emailNotifications,
        weeklySummary,
        marketplaceUpdates
      },
      aiSettings: {
        aiProcessingLevel,
        defaultLanguage,
        autoCorrectSpelling,
        enhanceDescriptions,
        categoryMapping
      }
    });
  };
  
  // Handle connect marketplace
  const handleConnectMarketplace = (marketplace: string) => {
    toast({
      title: `Connect to ${marketplace}`,
      description: `This would open the ${marketplace} authorization flow.`,
    });
  };
  
  // Handle disconnect marketplace
  const handleDisconnectMarketplace = (marketplace: string) => {
    toast({
      title: `Disconnect from ${marketplace}`,
      description: `This would disconnect your ${marketplace} account.`,
    });
  };
  
  // Get marketplace icon
  const getMarketplaceIcon = (marketplace: string) => {
    switch (marketplace.toLowerCase()) {
      case 'amazon': return <SiAmazon className="text-2xl mr-3" />;
      case 'walmart': return <SiWalmart className="text-2xl mr-3" />;
      case 'meta': return <SiMeta className="text-2xl mr-3" />;
      case 'tiktok': return <SiTiktok className="text-2xl mr-3" />;
      default: return null;
    }
  };
  
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle>Account Settings</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage your profile and preferences
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Profile Settings */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-4">Profile Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName" 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input 
                      id="company" 
                      type="text" 
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="role">Role</Label>
                    <Input 
                      id="role" 
                      type="text" 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Marketplace Connections */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-4">Marketplace Connections</h3>
                <div className="space-y-3">
                  {/* Amazon */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {getMarketplaceIcon('amazon')}
                      <div>
                        <p className="font-medium">Amazon Seller Central</p>
                        <p className="text-xs text-muted-foreground">
                          {connections.amazon.connected 
                            ? `Connected on ${connections.amazon.date}` 
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {connections.amazon.connected ? (
                        <div className="flex space-x-2">
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnectMarketplace('Amazon')}
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="border-primary text-primary hover:bg-primary/10"
                          onClick={() => handleConnectMarketplace('Amazon')}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Walmart */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {getMarketplaceIcon('walmart')}
                      <div>
                        <p className="font-medium">Walmart Marketplace</p>
                        <p className="text-xs text-muted-foreground">
                          {connections.walmart.connected 
                            ? `Connected on ${connections.walmart.date}` 
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {connections.walmart.connected ? (
                        <div className="flex space-x-2">
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnectMarketplace('Walmart')}
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="border-primary text-primary hover:bg-primary/10"
                          onClick={() => handleConnectMarketplace('Walmart')}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Meta */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {getMarketplaceIcon('meta')}
                      <div>
                        <p className="font-medium">Meta for Business</p>
                        <p className="text-xs text-muted-foreground">
                          {connections.meta.connected 
                            ? `Connected on ${connections.meta.date}` 
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {connections.meta.connected ? (
                        <div className="flex space-x-2">
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnectMarketplace('Meta')}
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="border-primary text-primary hover:bg-primary/10"
                          onClick={() => handleConnectMarketplace('Meta')}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* TikTok */}
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center">
                      {getMarketplaceIcon('tiktok')}
                      <div>
                        <p className="font-medium">TikTok Shop</p>
                        <p className="text-xs text-muted-foreground">
                          {connections.tiktok.connected 
                            ? `Connected on ${connections.tiktok.date}` 
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <div>
                      {connections.tiktok.connected ? (
                        <div className="flex space-x-2">
                          <Badge className="bg-green-100 text-green-800">Connected</Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDisconnectMarketplace('TikTok')}
                          >
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="border-primary text-primary hover:bg-primary/10"
                          onClick={() => handleConnectMarketplace('TikTok')}
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Notification Settings */}
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-4">Notification Preferences</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="email_notifications" 
                      checked={emailNotifications}
                      onCheckedChange={(checked) => setEmailNotifications(checked === true)}
                    />
                    <div>
                      <Label 
                        htmlFor="email_notifications" 
                        className="font-medium text-gray-700"
                      >
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about feed processing status and errors
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="weekly_summary" 
                      checked={weeklySummary}
                      onCheckedChange={(checked) => setWeeklySummary(checked === true)}
                    />
                    <div>
                      <Label 
                        htmlFor="weekly_summary" 
                        className="font-medium text-gray-700"
                      >
                        Weekly Summary
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get a weekly report of your data processing activity
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <Checkbox 
                      id="marketplace_updates" 
                      checked={marketplaceUpdates}
                      onCheckedChange={(checked) => setMarketplaceUpdates(checked === true)}
                    />
                    <div>
                      <Label 
                        htmlFor="marketplace_updates" 
                        className="font-medium text-gray-700"
                      >
                        Marketplace Updates
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about marketplace requirement changes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={saveSettingsMutation.isPending}
                >
                  {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar Settings */}
        <div>
          {/* AI Processing Settings */}
          <Card className="mb-6">
            <CardHeader className="pb-3 border-b">
              <CardTitle>AI Processing Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label htmlFor="aiProcessingLevel">AI Processing Level</Label>
                <Select 
                  value={aiProcessingLevel} 
                  onValueChange={setAiProcessingLevel}
                >
                  <SelectTrigger id="aiProcessingLevel">
                    <SelectValue placeholder="Select processing level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard - Balanced speed/quality</SelectItem>
                    <SelectItem value="basic">Basic - Faster processing</SelectItem>
                    <SelectItem value="enhanced">Enhanced - Higher quality (Premium)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="defaultLanguage">Default Language</Label>
                <Select 
                  value={defaultLanguage} 
                  onValueChange={setDefaultLanguage}
                >
                  <SelectTrigger id="defaultLanguage">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-start space-x-3">
                <Switch 
                  id="autoCorrectSpelling" 
                  checked={autoCorrectSpelling}
                  onCheckedChange={setAutoCorrectSpelling}
                />
                <div>
                  <Label 
                    htmlFor="autoCorrectSpelling" 
                    className="font-medium"
                  >
                    Auto-correct spelling
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Fix spelling errors in product names and descriptions
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Switch 
                  id="enhanceDescriptions" 
                  checked={enhanceDescriptions}
                  onCheckedChange={setEnhanceDescriptions}
                />
                <div>
                  <Label 
                    htmlFor="enhanceDescriptions" 
                    className="font-medium"
                  >
                    Enhance descriptions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Improve product descriptions for better engagement
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Switch 
                  id="categoryMapping" 
                  checked={categoryMapping}
                  onCheckedChange={setCategoryMapping}
                />
                <div>
                  <Label 
                    htmlFor="categoryMapping" 
                    className="font-medium"
                  >
                    Category mapping
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Auto-map to marketplace specific categories
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Subscription Plan */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle>Subscription Plan</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <Crown className="text-primary h-5 w-5 mr-2" />
                  <p className="font-medium text-primary-800">Premium Plan</p>
                </div>
                <div className="mt-2 space-y-2 text-sm text-primary-700">
                  <p>Billing: Monthly</p>
                  <p>Next billing date: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly processing limit:</span>
                  <span>50,000 items</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Used this month:</span>
                  <span>12,480 items</span>
                </div>
                <Progress 
                  className="h-2 my-2" 
                  value={25} 
                />
                <p className="text-xs text-muted-foreground text-right">25% used</p>
              </div>
              
              <div className="mt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: "Manage Subscription",
                      description: "This would open the subscription management page.",
                    });
                  }}
                >
                  Manage Subscription
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
