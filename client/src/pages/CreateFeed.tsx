import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import FileUpload, { UploadStatus } from "@/components/FileUpload";
import { Loader2, Upload, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

export default function CreateFeed() {
  const [feedName, setFeedName] = useState("");
  const [selectedMarketplace, setSelectedMarketplace] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedId, setFeedId] = useState<number | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const handleFileAccepted = (file: File) => {
    setUploadedFile(file);
    setUploadStatus("idle");
    setUploadError("");
  };
  
  const handleCreateFeed = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setUploadStatus("uploading");
    
    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 5;
      });
    }, 200);
    
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile!);
      formData.append("name", feedName);
      formData.append("marketplace", selectedMarketplace);
      
      // Create a new feed with the uploaded file
      const response = await apiRequest("/api/feeds/upload", {
        method: "POST",
        body: formData,
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus("success");
      
      // If successful, set the feed ID for redirection
      if (response.id) {
        setFeedId(response.id);
        toast({
          title: "Feed created successfully",
          description: `Your feed "${feedName}" has been created and is ready to process.`,
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setUploadStatus("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed");
      toast({
        title: "Error creating feed",
        description: "There was a problem creating your feed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const validateForm = () => {
    if (!feedName) {
      setUploadError("Please enter a feed name");
      return false;
    }
    
    if (!selectedMarketplace) {
      setUploadError("Please select a marketplace");
      return false;
    }
    
    if (!uploadedFile) {
      setUploadError("Please select a file to upload");
      return false;
    }
    
    return true;
  };
  
  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Create New Feed</h1>
          <p className="text-muted-foreground">Upload and configure a new product feed</p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feed Information</CardTitle>
              <CardDescription>
                Name your feed and choose a target marketplace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="feed-name">Feed Name</Label>
                <Input
                  id="feed-name"
                  placeholder="Enter a descriptive name"
                  value={feedName}
                  onChange={(e) => setFeedName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="marketplace">Target Marketplace</Label>
                <Select value={selectedMarketplace} onValueChange={setSelectedMarketplace}>
                  <SelectTrigger id="marketplace">
                    <SelectValue placeholder="Select marketplace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amazon">Amazon</SelectItem>
                    <SelectItem value="walmart">Walmart</SelectItem>
                    <SelectItem value="catch">Catch/Mirkal</SelectItem>
                    <SelectItem value="meta">Meta (Facebook)</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="reebelo">Reebelo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Upload Product Data</CardTitle>
              <CardDescription>
                Upload a CSV file with your product data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                onFileAccepted={handleFileAccepted}
                status={uploadStatus}
                progress={uploadProgress}
                error={uploadError}
              />
              
              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
              
              {uploadStatus === "success" && (
                <Alert variant="success" className="bg-green-500/10 border-green-500/50">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription>
                    Your feed was created successfully.
                    {feedId && " You can now process it or download it later."}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateFeed} 
                disabled={isSubmitting || uploadStatus === "success"}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Feed...
                  </>
                ) : uploadStatus === "success" ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Feed Created
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Create Feed
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feed Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Name</p>
                <p className="text-sm">{feedName || "Not specified"}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">Marketplace</p>
                <p className="text-sm">{selectedMarketplace || "Not selected"}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">File</p>
                <p className="text-sm">{uploadedFile?.name || "No file selected"}</p>
                {uploadedFile && (
                  <p className="text-xs text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>About Feedwork</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                This service transforms your product data into marketplace-ready formats 
                while preserving the exact number of original rows in your data.
              </p>
              <p className="text-sm">
                For every line in your source data, you'll receive exactly one row in your 
                transformed output, ensuring perfect 1:1 mapping between source and destination.
              </p>
            </CardContent>
          </Card>
          
          {uploadStatus === "success" && feedId && (
            <Card className="border-green-500/30 bg-green-500/5">
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  Your feed has been created successfully! You can now process it or access it later.
                </p>
                <Button className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
                  Process Feed <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}