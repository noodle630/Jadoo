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
      
      const response = await apiRequest("POST", "/api/feeds/upload", formData);
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
      <Card className="mb-6">
        <CardHeader className="pb-3 border-b">
          <CardTitle>Create New Feed</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your data and transform it for marketplace requirements
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
                <FileUploader 
                  onFileAccepted={handleFileUpload}
                  isUploading={uploadMutation.isPending}
                  progress={uploadProgress}
                  error={uploadError}
                />
                <div className="mt-4">
                  <Button 
                    onClick={handleUploadSubmit}
                    disabled={uploadMutation.isPending || !selectedFile}
                  >
                    Upload & Continue
                  </Button>
                </div>
              </div>

              {/* API Connection */}
              <div className="flex-1">
                <h3 className="text-md font-medium text-gray-700 mb-2">Connect API Feed</h3>
                <div className="border rounded-lg p-6 bg-white">
                  <div className="mb-4">
                    <Label htmlFor="apiEndpoint">API Endpoint URL</Label>
                    <Input 
                      id="apiEndpoint" 
                      type="text" 
                      placeholder="https://api.example.com/products"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                    />
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="authMethod">Authentication Method</Label>
                    <Select 
                      value={authMethod} 
                      onValueChange={setAuthMethod}
                    >
                      <SelectTrigger id="authMethod">
                        <SelectValue placeholder="Select auth method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apiKey">API Key</SelectItem>
                        <SelectItem value="oauth">OAuth 2.0</SelectItem>
                        <SelectItem value="basic">Basic Auth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="apiKey">API Key/Token</Label>
                    <Input 
                      id="apiKey" 
                      type="password" 
                      placeholder="Enter your API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleApiConnectionSubmit}
                    disabled={apiConnectionMutation.isPending}
                  >
                    Connect & Continue
                  </Button>
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
