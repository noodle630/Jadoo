import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import ProgressSteps from "@/components/ProgressSteps";
import FileUploader from "@/components/FileUploader";
import DataPreview from "@/components/DataPreview";
import MarketplaceSelector from "@/components/MarketplaceSelector";
import ProcessingStatus from "@/components/ProcessingStatus";
import FeedExport from "@/components/FeedExport";

// Sample data for preview
const sampleData = [
  { sku: "TS-001-BLK", name: "Premium Cotton T-Shirt Black", price: "$19.99", inventory: "45", category: "Apparel" },
  { sku: "TS-001-WHT", name: "Premium Cotton T-Shirt White", price: "$19.99", inventory: "32", category: "Apparel" },
  { sku: "HD-100-BLU", name: "Wireless Headphones Blue", price: "$89.99", inventory: "18", category: "Electronics" }
];

const sampleIssues = [
  { type: "missing", count: 3, description: "missing descriptions" },
  { type: "inconsistent", count: 5, description: "with inconsistent category naming" },
  { type: "price", count: 2, description: "with unusually high prices (possible errors)" }
];

export default function NewFeed() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Feed creation state
  const [currentStep, setCurrentStep] = useState(1);
  const [feedName, setFeedName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [authMethod, setAuthMethod] = useState("apiKey");
  const [apiKey, setApiKey] = useState("");
  const [selectedMarketplace, setSelectedMarketplace] = useState("amazon");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [aiProcessProgress, setAiProcessProgress] = useState(20);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [uploadError, setUploadError] = useState("");
  
  // Current step labels
  const steps = ["Upload Data", "Preview & Configure", "AI Processing", "Generate Feed"];
  
  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 99) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 300);
      
      // Log the form data being submitted
      console.log("Uploading file with FormData");
      for (const [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? value.name : value}`);
      }
      
      const response = await apiRequest("POST", "/api/feeds/upload", formData, true);
      clearInterval(interval);
      setUploadProgress(100);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "File uploaded successfully",
        description: "Your file has been uploaded and is ready for processing.",
      });
      // Move to the next step
      setCurrentStep(2);
      // Reset progress
      setUploadProgress(0);
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "There was an error uploading your file.",
        variant: "destructive",
      });
      setUploadError(error.message || "Upload failed. Please try again.");
      setUploadProgress(0);
    }
  });
  
  // API connection mutation
  const apiConnectionMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/feeds/api", data).then(res => res.json());
    },
    onSuccess: (data) => {
      toast({
        title: "API connected successfully",
        description: "Your API connection has been established.",
      });
      // Move to the next step
      setCurrentStep(2);
    },
    onError: (error) => {
      toast({
        title: "API connection failed",
        description: error.message || "There was an error connecting to the API.",
        variant: "destructive",
      });
    }
  });
  
  // AI Processing mutation
  const processWithAiMutation = useMutation({
    mutationFn: async () => {
      // Placeholder for real feed ID
      return await apiRequest("POST", "/api/feeds/1/process", {}).then(res => res.json());
    },
    onSuccess: () => {
      // Start a simulated progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setAiProcessProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          // Simulate processing completion after reaching 100%
          setTimeout(() => {
            setProcessingComplete(true);
          }, 500);
        }
      }, 200);
    },
    onError: (error) => {
      toast({
        title: "Processing failed",
        description: error.message || "There was an error processing your data.",
        variant: "destructive",
      });
    }
  });
  
  // Handle file selection and upload
  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    setFeedName(file.name.replace(/\.[^/.]+$/, "")); // Remove extension for feed name
  };
  
  // Submit file upload
  const handleUploadSubmit = () => {
    if (!selectedFile) {
      setUploadError("Please select a file to upload");
      return;
    }
    
    if (!feedName) {
      setUploadError("Please enter a feed name");
      return;
    }
    
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("name", feedName);
    formData.append("marketplace", selectedMarketplace);
    
    setUploadError("");
    uploadMutation.mutate(formData);
  };
  
  // Submit API connection
  const handleApiConnectionSubmit = () => {
    if (!apiEndpoint) {
      toast({
        title: "Validation Error",
        description: "Please enter an API endpoint",
        variant: "destructive",
      });
      return;
    }
    
    if (!feedName) {
      toast({
        title: "Validation Error",
        description: "Please enter a feed name",
        variant: "destructive",
      });
      return;
    }
    
    apiConnectionMutation.mutate({
      name: feedName,
      endpoint: apiEndpoint,
      authMethod,
      authKey: apiKey,
      marketplace: selectedMarketplace
    });
  };
  
  // Process data with AI
  const handleProcessWithAi = () => {
    processWithAiMutation.mutate();
  };
  
  // Handle step navigation
  const moveToStep = (step: number) => {
    // Only allow moving backward or to the next step
    if (step < currentStep || step === currentStep + 1) {
      setCurrentStep(step);
    }
  };
  
  // Handle download action
  const handleDownload = () => {
    toast({
      title: "Feed downloaded",
      description: "Your marketplace feed has been downloaded successfully.",
    });
    // Redirect to dashboard after successful download
    navigate("/");
  };
  
  // Handle save config action
  const handleSaveConfig = () => {
    toast({
      title: "Configuration saved",
      description: "Your feed configuration has been saved successfully.",
    });
  };
  
  return (
    <div className="p-6">
      <Card className="mb-6 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
        <CardHeader className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-white bg-clip-text text-transparent">
            Create Feed
          </CardTitle>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Transform your product data into marketplace-ready feeds with AI
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Progress Steps */}
          <ProgressSteps 
            steps={steps} 
            currentStep={currentStep} 
            onStepClick={currentStep < 4 ? moveToStep : undefined}
          />
          
          {/* Step 1: Upload Data */}
          {currentStep === 1 && (
            <div className="flex flex-col md:flex-row md:space-x-6">
              {/* CSV Upload */}
              <div className="flex-1 mb-6 md:mb-0">
                <h3 className="text-md font-medium text-gray-700 mb-2">Upload CSV File</h3>
                <div className="mb-4">
                  <Label htmlFor="feedName">Feed Name</Label>
                  <Input 
                    id="feedName" 
                    value={feedName} 
                    onChange={(e) => setFeedName(e.target.value)} 
                    placeholder="Enter a name for this feed"
                    className="mt-1"
                  />
                </div>
                <div className="mb-6">
                  <div className={`
                    border-2 border-dashed rounded-lg p-10 text-center transition-all duration-200 
                    ${selectedFile ? 'bg-blue-50/30 border-blue-300 dark:bg-blue-950/10 dark:border-blue-800' : 'border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/20'}
                    ${uploadMutation.isPending ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''}
                  `}>
                    {selectedFile && !uploadMutation.isPending ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600 dark:text-green-400">
                            <path d="M20.946 8.79L18.331 6.326C18.1584 6.16557 17.9237 6.07658 17.68 6.083H13.152C12.8525 6.08393 12.5854 6.24877 12.4616 6.51579C12.3378 6.78281 12.3787 7.09347 12.568 7.322C12.7572 7.55053 13.0648 7.65841 13.362 7.594H17.049L6.20499 17.792L4.99999 16.655V14.01C4.99906 13.7105 4.83423 13.4434 4.56721 13.3196C4.30019 13.1958 3.98953 13.2367 3.76099 13.426C3.53246 13.6152 3.42458 13.9228 3.48899 14.22V17.249C3.48899 17.773 3.71099 18.274 4.10099 18.632L5.75699 20.17C6.26099 20.634 6.90799 20.887 7.58099 20.887C8.25399 20.887 8.90099 20.634 9.40399 20.17L20.797 9.566C21.0038 9.37503 21.1112 9.09858 21.0861 8.8184C21.061 8.53821 20.9062 8.28573 20.665 8.139L20.946 8.79Z" fill="currentColor"/>
                            <path d="M21 12.261V17.249C21 17.773 20.778 18.274 20.388 18.632L18.731 20.17C18.228 20.634 17.582 20.887 16.908 20.887C16.234 20.887 15.588 20.634 15.085 20.17L8.966 14.571C8.74599 14.3667 8.43429 14.323 8.16663 14.4491C7.89896 14.5752 7.73495 14.8406 7.73495 15.131C7.73495 15.4214 7.89896 15.6868 8.16663 15.813L14.286 21.412C15.06 22.129 16.077 22.525 17.127 22.503C18.177 22.481 19.175 22.043 19.917 21.294L21.574 19.733C22.503 18.857 23.02 17.664 23 16.424V12.261C23.0009 11.9615 22.8361 11.6944 22.5691 11.5706C22.3021 11.4467 21.9914 11.4877 21.7629 11.677C21.5344 11.8662 21.4265 12.1738 21.4909 12.471L21 12.261Z" fill="currentColor"/>
                            <path d="M16.5 6.25H10.5C10.0858 6.25 9.75 6.58579 9.75 7C9.75 7.41421 10.0858 7.75 10.5 7.75H16.5C16.9142 7.75 17.25 7.41421 17.25 7C17.25 6.58579 16.9142 6.25 16.5 6.25Z" fill="currentColor"/>
                            <path d="M3.5 12.25C3.91421 12.25 4.25 11.9142 4.25 11.5C4.25 11.0858 3.91421 10.75 3.5 10.75C3.08579 10.75 2.75 11.0858 2.75 11.5C2.75 11.9142 3.08579 12.25 3.5 12.25Z" fill="currentColor"/>
                            <path d="M5.5 9.25C5.91421 9.25 6.25 8.91421 6.25 8.5C6.25 8.08579 5.91421 7.75 5.5 7.75C5.08579 7.75 4.75 8.08579 4.75 8.5C4.75 8.91421 5.08579 9.25 5.5 9.25Z" fill="currentColor"/>
                            <path d="M7.5 6.25C7.91421 6.25 8.25 5.91421 8.25 5.5C8.25 5.08579 7.91421 4.75 7.5 4.75C7.08579 4.75 6.75 5.08579 6.75 5.5C6.75 5.91421 7.08579 6.25 7.5 6.25Z" fill="currentColor"/>
                            <path d="M10.5 4.25C10.9142 4.25 11.25 3.91421 11.25 3.5C11.25 3.08579 10.9142 2.75 10.5 2.75C10.0858 2.75 9.75 3.08579 9.75 3.5C9.75 3.91421 10.0858 4.25 10.5 4.25Z" fill="currentColor"/>
                            <path d="M13.5 3.25C13.9142 3.25 14.25 2.91421 14.25 2.5C14.25 2.08579 13.9142 1.75 13.5 1.75C13.0858 1.75 12.75 2.08579 12.75 2.5C12.75 2.91421 13.0858 3.25 13.5 3.25Z" fill="currentColor"/>
                            <path d="M16.5 4.25C16.9142 4.25 17.25 3.91421 17.25 3.5C17.25 3.08579 16.9142 2.75 16.5 2.75C16.0858 2.75 15.75 3.08579 15.75 3.5C15.75 3.91421 16.0858 4.25 16.5 4.25Z" fill="currentColor"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-slate-200">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setSelectedFile(null)}
                          className="mt-1"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : uploadMutation.isPending ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 dark:border-blue-800 dark:border-t-blue-400 animate-spin" />
                        <div>
                          <p className="text-sm font-medium dark:text-slate-200">Uploading file...</p>
                          <p className="text-xs text-muted-foreground">{uploadProgress}% complete</p>
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="flex flex-col items-center gap-3 cursor-pointer"
                        onClick={() => document.getElementById('file-upload')?.click()}
                      >
                        <div className="h-14 w-14 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-600 dark:text-blue-400">
                            <path d="M7 10V9C7 6.23858 9.23858 4 12 4C14.7614 4 17 6.23858 17 9V10C19.2091 10 21 11.7909 21 14C21 16.2091 19.2091 18 17 18H7C4.79086 18 3 16.2091 3 14C3 11.7909 4.79086 10 7 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 12V15M12 15L14 13M12 15L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium dark:text-slate-200">Drag and drop your file here</p>
                          <p className="text-xs text-muted-foreground">or click to browse</p>
                        </div>
                        <div className="mt-1">
                          <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                            CSV, Excel (.xls, .xlsx)
                          </span>
                        </div>
                        <input 
                          type="file" 
                          id="file-upload" 
                          accept=".csv,.xls,.xlsx" 
                          onChange={(e) => {
                            console.log("File selected:", e.target.files);
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden" 
                        />
                      </div>
                    )}
                  </div>
                  
                  {uploadError && (
                    <div className="mt-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-2 rounded-md">
                      {uploadError}
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <Button 
                    onClick={handleUploadSubmit}
                    disabled={uploadMutation.isPending || !selectedFile}
                    className="relative overflow-hidden button-hovered"
                  >
                    <span className="relative z-10">Transform with AI</span>
                    {!uploadMutation.isPending && selectedFile && (
                      <span className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </Button>
                </div>
              </div>

              {/* API Connection */}
              <div className="flex-1">
                <h3 className="text-md font-medium text-slate-800 dark:text-slate-200 mb-3">Connect API Feed</h3>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-white dark:bg-slate-950 shadow-sm">
                  <div className="mb-5">
                    <Label htmlFor="apiEndpoint" className="text-sm">API Endpoint URL</Label>
                    <div className="mt-1.5 relative text-field-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.6001 9H20.4001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M3.6001 15H20.4001" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M11.5002 3C9.8145 5.69961 9 8.81948 9 12C9 15.1805 9.8145 18.3004 11.5002 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12.5002 3C14.1859 5.69961 15.0005 8.81948 15.0005 12C15.0005 15.1805 14.1859 18.3004 12.5002 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <Input 
                        id="apiEndpoint" 
                        type="text" 
                        placeholder="https://api.example.com/products"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>
                  
                  <div className="mb-5">
                    <Label htmlFor="authMethod" className="text-sm">Authentication Method</Label>
                    <div className="mt-1.5">
                      <Select 
                        value={authMethod} 
                        onValueChange={setAuthMethod}
                      >
                        <SelectTrigger id="authMethod" className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                          <SelectValue placeholder="Select auth method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apiKey">API Key</SelectItem>
                          <SelectItem value="oauth">OAuth 2.0</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mb-5">
                    <Label htmlFor="apiKey" className="text-sm">API Key/Token</Label>
                    <div className="mt-1.5 relative text-field-with-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <path d="M15 7C16.1046 7 17 7.89543 17 9C17 10.1046 16.1046 11 15 11C13.8954 11 13 10.1046 13 9C13 7.89543 13.8954 7 15 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.363 11.5L7.83 18.033C7.64819 18.2145 7.41672 18.3358 7.16557 18.3809C6.91442 18.4261 6.65292 18.3933 6.421 18.287L4.636 17.396C4.45544 17.3015 4.30512 17.1617 4.19796 16.991C4.0908 16.8204 4.03077 16.626 4.025 16.427L4.013 14.484C4.01153 14.2906 4.05504 14.1001 4.13984 13.9278C4.22464 13.7555 4.34858 13.6059 4.5 13.491L11.051 7.621C11.2036 7.47873 11.3962 7.39274 11.599 7.37279C11.8018 7.35284 12.0054 7.40006 12.1792 7.50756C12.353 7.61506 12.4875 7.7775 12.5631 7.96849C12.6388 8.15948 12.6516 8.36918 12.6 8.568L12.245 9.962C12.2081 10.1065 12.2088 10.2583 12.2471 10.4026C12.2854 10.5469 12.3599 10.6784 12.463 10.784L13.214 11.535C13.3197 11.6409 13.4526 11.7175 13.5987 11.7574C13.7448 11.7973 13.8991 11.7991 14.046 11.762L15.445 11.403C15.6441 11.3505 15.8543 11.3628 16.0458 11.4382C16.2373 11.5137 16.4003 11.6482 16.5082 11.8224C16.616 11.9966 16.6634 12.2006 16.6437 12.4039C16.624 12.6071 16.538 12.8001 16.396 12.953L14.363 11.5ZM14.363 11.5L16.396 12.953" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 15L21 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M20 11L22 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 8L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <Input 
                        id="apiKey" 
                        type="password" 
                        placeholder="Enter your API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="pl-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleApiConnectionSubmit}
                    disabled={apiConnectionMutation.isPending}
                    className="w-full mt-2 relative overflow-hidden button-hovered bg-gradient-to-r from-blue-600 to-indigo-600 border-0 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <span className="relative z-10 text-white font-medium">
                      {apiConnectionMutation.isPending ? 'Connecting...' : 'Connect & Continue'}
                    </span>
                  </Button>
                </div>
                
                <div className="mt-4 border border-blue-100 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
                  <p className="text-xs text-blue-700 dark:text-blue-400 flex">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5 mt-0.5 flex-shrink-0 text-blue-600">
                      <path d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Connect to your product database directly to import inventory in real-time. We support REST APIs, Shopify, WooCommerce, and more.</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Preview & Configure */}
          {currentStep === 2 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-4">Data Preview & Configuration</h3>
              
              {/* Sample data preview table */}
              <DataPreview 
                data={sampleData}
                columns={["sku", "name", "price", "inventory", "category"]}
                issues={sampleIssues}
              />
              
              {/* Select Target Marketplace */}
              <div className="bg-white border rounded-lg p-4 my-6">
                <h4 className="font-medium text-gray-700 mb-3">Select Target Marketplace</h4>
                <MarketplaceSelector 
                  selectedMarketplace={selectedMarketplace}
                  onSelect={setSelectedMarketplace}
                />
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => moveToStep(1)}>
                  Back
                </Button>
                <Button onClick={() => moveToStep(3)}>
                  Process with AI
                </Button>
              </div>
            </div>
          )}
          
          {/* Step 3: AI Processing */}
          {currentStep === 3 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-700 mb-4">AI Data Transformation</h3>
              
              <ProcessingStatus 
                isComplete={processingComplete}
                progress={aiProcessProgress}
                onCancel={() => moveToStep(2)}
                onContinue={() => moveToStep(4)}
                estimatedTimeRemaining="~2 min"
                currentTask="Optimizing product titles and descriptions"
              />
            </div>
          )}
          
          {/* Step 4: Generate Feed */}
          {currentStep === 4 && (
            <FeedExport 
              feedName={feedName}
              itemCount={124}
              categories={5}
              marketplace={selectedMarketplace}
              onDownload={handleDownload}
              onSaveConfig={handleSaveConfig}
              onBack={() => moveToStep(3)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
