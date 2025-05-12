import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Download, Clock, HistoryIcon, User, Settings, LogOut, Plus } from "lucide-react";

// Components for each section
const FeedUpload = () => {
  return (
    <div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-xl">Upload New Feed</CardTitle>
          <CardDescription>
            Upload your product data file to begin the transformation process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-12 cursor-pointer hover:border-blue-500 transition-colors">
            <Upload className="h-12 w-12 text-gray-500 mb-4" />
            <p className="text-sm text-gray-400 mb-2">Drag & drop your CSV file here</p>
            <p className="text-xs text-gray-500 mb-4">or</p>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Browse Files
            </Button>
            <p className="text-xs text-gray-500 mt-4">CSV, Excel up to 10MB</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-xl">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium">products-data-{i}.csv</p>
                    <p className="text-xs text-gray-500">Uploaded 2 days ago • 1.2MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="link" className="text-blue-400 p-0">
            View all uploads
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const Transformations = () => {
  return (
    <div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Marketplace Transformations</CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Transformation
            </Button>
          </div>
          <CardDescription>
            Transform your product feeds to different marketplace formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Amazon", "Walmart", "Catch", "Meta", "TikTok", "Reebelo"].map((marketplace) => (
              <Card key={marketplace} className="border-gray-700 bg-gray-800 hover:border-blue-500 cursor-pointer transition-all">
                <CardHeader className="p-4">
                  <CardTitle className="text-md">{marketplace}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-gray-400">Last used: 3 days ago</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-xl">Recent Transformations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: "Summer Collection", marketplace: "Amazon", status: "Completed", date: "2 days ago" },
              { name: "Electronics", marketplace: "Walmart", status: "Processing", date: "12 hours ago" },
              { name: "Home Products", marketplace: "Catch", status: "Failed", date: "1 week ago" },
            ].map((transform, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
                <div className="flex items-center">
                  <div className="mr-3">
                    {transform.status === "Completed" && (
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                    {transform.status === "Processing" && (
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    )}
                    {transform.status === "Failed" && (
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{transform.name}</p>
                    <p className="text-xs text-gray-500">{transform.marketplace} • {transform.date}</p>
                  </div>
                </div>
                <div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Templates = () => {
  return (
    <div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Saved Templates</CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
          <CardDescription>
            Reuse your transformation settings with saved templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: "Amazon Standard", marketplace: "Amazon", lastUsed: "3 days ago" },
              { name: "Walmart Full", marketplace: "Walmart", lastUsed: "1 week ago" },
              { name: "Catch Australia", marketplace: "Catch", lastUsed: "2 weeks ago" },
              { name: "Meta Commerce", marketplace: "Meta", lastUsed: "1 month ago" },
            ].map((template, i) => (
              <Card key={i} className="border-gray-700 bg-gray-800 hover:border-blue-500 cursor-pointer transition-all">
                <CardHeader className="p-4">
                  <CardTitle className="text-md">{template.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {template.marketplace}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-gray-400">Last used: {template.lastUsed}</p>
                  <div className="flex mt-3">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0 mr-2">
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white p-0">
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const TransformationHistory = () => {
  return (
    <div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-xl">Transformation History</CardTitle>
          <CardDescription>
            View all your past transformations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: "Summer Collection", marketplace: "Amazon", status: "Completed", date: "May 10, 2025", rows: 325 },
              { name: "Electronics", marketplace: "Walmart", status: "Completed", date: "May 9, 2025", rows: 127 },
              { name: "Home Products", marketplace: "Catch", status: "Failed", date: "May 8, 2025", rows: 512 },
              { name: "Clothing", marketplace: "Meta", status: "Completed", date: "May 7, 2025", rows: 214 },
              { name: "Tech Accessories", marketplace: "TikTok", status: "Completed", date: "May 6, 2025", rows: 67 },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-400">{item.marketplace} • {item.date}</p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    item.status === "Completed" ? "bg-green-900/30 text-green-400" : 
                    item.status === "Failed" ? "bg-red-900/30 text-red-400" : 
                    "bg-yellow-900/30 text-yellow-400"
                  }`}>
                    {item.status}
                  </div>
                </div>
                <div className="text-sm text-gray-400 flex justify-between">
                  <span>{item.rows} rows processed</span>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Load More
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const Account = () => {
  const { user, logout } = useAuth();
  
  return (
    <div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-xl">Account</CardTitle>
          <CardDescription>
            Manage your account settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-6">
            <div className="h-16 w-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="font-medium">{user?.firstName || "User"} {user?.lastName || ""}</h3>
              <p className="text-sm text-gray-400">{user?.email || "No email available"}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-800">
              <h4 className="text-sm font-medium mb-2">Account Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Role</div>
                <div>{user?.role || "User"}</div>
                <div className="text-gray-400">Member Since</div>
                <div>May 2025</div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-gray-800">
              <h4 className="text-sm font-medium mb-2">Usage Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Total Transformations</div>
                <div>27</div>
                <div className="text-gray-400">Products Processed</div>
                <div>1,245</div>
                <div className="text-gray-400">Templates Created</div>
                <div>4</div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" className="text-gray-400">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Log out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("upload");
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Project S
            </h1>
            <div className="ml-8 hidden md:flex space-x-1">
              {[
                { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
                { id: "transform", label: "Transform", icon: <FileText className="h-4 w-4" /> },
                { id: "templates", label: "Templates", icon: <Clock className="h-4 w-4" /> },
                { id: "history", label: "History", icon: <HistoryIcon className="h-4 w-4" /> },
              ].map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  className={`text-sm ${activeTab === item.id ? "bg-gray-800" : "text-gray-400"}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" className="text-gray-400" onClick={() => setActiveTab("account")}>
              <div className="flex items-center">
                <div className="hidden md:block mr-2 text-right">
                  <p className="text-sm font-medium">{user?.firstName || "User"}</p>
                  <p className="text-xs text-gray-500">{user?.email || ""}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                  {user?.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="md:hidden mb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="transform">Transform</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {activeTab === "upload" && <FeedUpload />}
        {activeTab === "transform" && <Transformations />}
        {activeTab === "templates" && <Templates />}
        {activeTab === "history" && <TransformationHistory />}
        {activeTab === "account" && <Account />}
      </main>
    </div>
  );
}