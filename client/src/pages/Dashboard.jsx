var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Download, Clock, History, User, Settings, LogOut, Plus } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import TransformView from "@/components/TransformView";
const FeedUpload = ({ onUpdateState, onNavigate }) => {
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('idle');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const [selectedMarketplace, setSelectedMarketplace] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    // Update shared state and navigate to the transform tab
    const goToTransform = () => {
        // Update shared state with file and marketplace info
        onUpdateState({
            uploadedFile: uploadFile,
            selectedMarketplace: selectedMarketplace,
            feedName: (uploadFile === null || uploadFile === void 0 ? void 0 : uploadFile.name) || "Untitled Feed",
            lastUploadTime: new Date()
        });
        // Navigate to transform tab
        onNavigate("transform");
    };
    const handleFileAccepted = (file) => {
        setUploadFile(file);
        // Reset status when a new file is selected
        setUploadStatus('idle');
        setUploadError('');
        setUploadSuccess(false);
    };
    const handleUpload = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!uploadFile) {
            setUploadError('Please select a file to upload');
            return;
        }
        if (!selectedMarketplace) {
            setUploadError('Please select a marketplace');
            return;
        }
        setUploadStatus('uploading');
        // Simulate upload progress
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 95) {
                    clearInterval(progressInterval);
                    return prev;
                }
                return prev + 5;
            });
        }, 200);
        try {
            // Simulate API call
            yield new Promise(resolve => setTimeout(resolve, 2000));
            // In a real app, you would upload the file to your server and preserve 1:1 mapping
            // const formData = new FormData();
            // formData.append('file', uploadFile);
            // formData.append('marketplace', selectedMarketplace);
            // formData.append('preserveMapping', 'true'); // Ensure 1:1 row mapping
            // const response = await fetch('/api/feeds/upload', {
            //   method: 'POST',
            //   body: formData,
            // });
            // if (!response.ok) throw new Error('Upload failed');
            clearInterval(progressInterval);
            setUploadProgress(100);
            setUploadStatus('success');
            setUploadSuccess(true);
            // Wait a short time to show the success state before redirecting
            setTimeout(() => {
                goToTransform();
            }, 1000);
        }
        catch (error) {
            clearInterval(progressInterval);
            setUploadStatus('error');
            setUploadError(error instanceof Error ? error.message : 'Upload failed');
        }
    });
    return (<div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-xl">Upload New Feed</CardTitle>
          <CardDescription>
            Upload your product data file to begin the transformation process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <FileUpload onFileAccepted={handleFileAccepted} status={uploadStatus} progress={uploadProgress} error={uploadError}/>
            
            {uploadFile && uploadStatus !== 'error' && (<div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-2">Select Marketplace</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {["Amazon", "Walmart", "Catch", "Meta", "TikTok", "Reebelo"].map((marketplace) => (<div key={marketplace} className={`border rounded-lg p-3 cursor-pointer transition-colors ${selectedMarketplace === marketplace
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-700 hover:border-blue-400 bg-gray-800/50'}`} onClick={() => setSelectedMarketplace(marketplace)}>
                        <p className="text-sm font-medium">{marketplace}</p>
                      </div>))}
                  </div>
                </div>
                
                {uploadStatus === 'success' ? (<Button className="w-full bg-green-600 hover:bg-green-700" onClick={goToTransform}>
                    Continue to Transform
                  </Button>) : (<Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleUpload} disabled={uploadStatus === 'uploading'}>
                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Start Transformation'}
                  </Button>)}
              </div>)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <CardTitle className="text-xl">Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (<div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 hover:bg-gray-750">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3"/>
                  <div>
                    <p className="text-sm font-medium">products-data-{i}.csv</p>
                    <p className="text-xs text-gray-500">Uploaded 2 days ago • 1.2MB</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4"/>
                </Button>
              </div>))}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="link" className="text-blue-400 p-0">
            View all uploads
          </Button>
        </CardFooter>
      </Card>
    </div>);
};
const Transformations = () => {
    return (<div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Marketplace Transformations</CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2"/>
              New Transformation
            </Button>
          </div>
          <CardDescription>
            Transform your product feeds to different marketplace formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {["Amazon", "Walmart", "Catch", "Meta", "TikTok", "Reebelo"].map((marketplace) => (<Card key={marketplace} className="border-gray-700 bg-gray-800 hover:border-blue-500 cursor-pointer transition-all">
                <CardHeader className="p-4">
                  <CardTitle className="text-md">{marketplace}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-xs text-gray-400">Last used: 3 days ago</p>
                </CardContent>
              </Card>))}
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
        ].map((transform, i) => (<div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-800">
                <div className="flex items-center">
                  <div className="mr-3">
                    {transform.status === "Completed" && (<div className="h-2 w-2 rounded-full bg-green-500"/>)}
                    {transform.status === "Processing" && (<div className="h-2 w-2 rounded-full bg-yellow-500"/>)}
                    {transform.status === "Failed" && (<div className="h-2 w-2 rounded-full bg-red-500"/>)}
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
              </div>))}
          </div>
        </CardContent>
      </Card>
    </div>);
};
const Templates = () => {
    return (<div className="grid gap-4">
      <Card className="border-gray-800 bg-gray-900/50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">Saved Templates</CardTitle>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2"/>
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
        ].map((template, i) => (<Card key={i} className="border-gray-700 bg-gray-800 hover:border-blue-500 cursor-pointer transition-all">
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
              </Card>))}
          </div>
        </CardContent>
      </Card>
    </div>);
};
const TransformationHistory = () => {
    return (<div className="grid gap-4">
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
        ].map((item, i) => (<div key={i} className="p-4 rounded-lg bg-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-gray-400">{item.marketplace} • {item.date}</p>
                  </div>
                  <div className={`text-xs px-2 py-1 rounded ${item.status === "Completed" ? "bg-green-900/30 text-green-400" :
                item.status === "Failed" ? "bg-red-900/30 text-red-400" :
                    "bg-yellow-900/30 text-yellow-400"}`}>
                    {item.status}
                  </div>
                </div>
                <div className="text-sm text-gray-400 flex justify-between">
                  <span>{item.rows} rows processed</span>
                  <div className="space-x-2">
                    <Button variant="ghost" size="sm" className="text-xs">
                      <FileText className="h-3 w-3 mr-1"/>
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs">
                      <Download className="h-3 w-3 mr-1"/>
                      Download
                    </Button>
                  </div>
                </div>
              </div>))}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full">
            Load More
          </Button>
        </CardFooter>
      </Card>
    </div>);
};
const Account = () => {
    const { user, logout } = useAuth();
    return (<div className="grid gap-4">
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
              {(user === null || user === void 0 ? void 0 : user.profileImageUrl) ? (<img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover"/>) : (<User className="h-8 w-8 text-gray-400"/>)}
            </div>
            <div>
              <h3 className="font-medium">{(user === null || user === void 0 ? void 0 : user.firstName) || "User"} {(user === null || user === void 0 ? void 0 : user.lastName) || ""}</h3>
              <p className="text-sm text-gray-400">{(user === null || user === void 0 ? void 0 : user.email) || "No email available"}</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-800">
              <h4 className="text-sm font-medium mb-2">Account Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">Role</div>
                <div>User</div>
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
            <Settings className="h-4 w-4 mr-2"/>
            Settings
          </Button>
          <Button variant="destructive" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2"/>
            Log out
          </Button>
        </CardFooter>
      </Card>
    </div>);
};
export default function Dashboard() {
    const [activeTab, setActiveTab] = useState("upload");
    const [sharedState, setSharedState] = useState({
        uploadedFile: null,
        selectedMarketplace: null,
        feedName: "",
        lastUploadTime: null
    });
    const { user } = useAuth();
    // This function allows child components to navigate between tabs
    const navigateToTab = (tab) => {
        setActiveTab(tab);
    };
    return (<div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              Project S
            </h1>
            <div className="ml-8 hidden md:flex space-x-1">
              {[
            { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4"/> },
            { id: "transform", label: "Transform", icon: <FileText className="h-4 w-4"/> },
            { id: "templates", label: "Templates", icon: <Clock className="h-4 w-4"/> },
            { id: "history", label: "History", icon: <History className="h-4 w-4"/> },
        ].map((item) => (<Button key={item.id} variant={activeTab === item.id ? "secondary" : "ghost"} className={`text-sm ${activeTab === item.id ? "bg-gray-800" : "text-gray-400"}`} onClick={() => setActiveTab(item.id)}>
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </Button>))}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" className="text-gray-400" onClick={() => setActiveTab("account")}>
              <div className="flex items-center">
                <div className="hidden md:block mr-2 text-right">
                  <p className="text-sm font-medium">{(user === null || user === void 0 ? void 0 : user.firstName) || "User"}</p>
                  <p className="text-xs text-gray-500">{(user === null || user === void 0 ? void 0 : user.email) || ""}</p>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                  {(user === null || user === void 0 ? void 0 : user.profileImageUrl) ? (<img src={user.profileImageUrl} alt="Profile" className="h-full w-full object-cover"/>) : (<User className="h-4 w-4 text-gray-400"/>)}
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

        {activeTab === "upload" && (<FeedUpload onUpdateState={(data) => setSharedState(Object.assign(Object.assign({}, sharedState), data))} onNavigate={navigateToTab}/>)}
        {activeTab === "transform" && (<TransformView feedData={sharedState}/>)}
        {activeTab === "templates" && <Templates />}
        {activeTab === "history" && <TransformationHistory />}
        {activeTab === "account" && <Account />}
      </main>
    </div>);
}
