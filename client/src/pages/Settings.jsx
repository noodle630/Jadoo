import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
export default function Settings() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("account");
    const handleSave = () => {
        toast({
            title: "Settings saved",
            description: "Your settings have been saved successfully"
        });
    };
    return (<div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="John"/>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Smith"/>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="john@example.com"/>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" placeholder="Acme Inc."/>
              </div>
              
              <Button onClick={handleSave}>Save Changes</Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password"/>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password"/>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password"/>
              </div>
              
              <Button onClick={handleSave}>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Integration</CardTitle>
              <CardDescription>
                Manage your API keys for external services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="openaiKey">OpenAI API Key</Label>
                  <Input id="openaiKey" type="password" placeholder="sk-..."/>
                  <p className="text-sm text-muted-foreground">Used for advanced AI-powered transformations</p>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="amazonId">Amazon Seller ID</Label>
                  <Input id="amazonId" placeholder="A2XXXXXXXXXXX"/>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="amazonKey">Amazon API Key</Label>
                  <Input id="amazonKey" type="password"/>
                </div>
                
                <Separator />
                
                <div className="space-y-2">
                  <Label htmlFor="walmartId">Walmart Seller ID</Label>
                  <Input id="walmartId"/>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="walmartKey">Walmart API Token</Label>
                  <Input id="walmartKey" type="password"/>
                </div>
              </div>
              
              <Button onClick={handleSave}>Save API Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Preferences</CardTitle>
              <CardDescription>
                Customize your application experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="darkMode">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                </div>
                <Switch id="darkMode" defaultChecked/>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive email updates about your transformations</p>
                </div>
                <Switch id="emailNotifications"/>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="saveHistory">Save Transformation History</Label>
                  <p className="text-sm text-muted-foreground">Keep history of all your transformations</p>
                </div>
                <Switch id="saveHistory" defaultChecked/>
              </div>
              
              <Button onClick={handleSave}>Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);
}
