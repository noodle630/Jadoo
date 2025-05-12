import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import {
  FileText,
  Upload,
  ArrowRight,
  FileUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileOutput,
  FilePlus2,
} from "lucide-react";

// Schema for validating the form data
const formSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  marketplace: z.enum(["amazon", "walmart", "catch", "meta", "tiktok", "reebelo"]),
  description: z.string().optional(),
  saveTemplate: z.boolean().optional(),
  templateName: z.string().optional(),
});

export default function CreateFeed() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedId, setFeedId] = useState<number | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState<"idle" | "processing" | "completed" | "error">("idle");
  const processingRef = useRef<NodeJS.Timeout | null>(null);

  // Form definition
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      marketplace: "amazon",
      description: "",
      saveTemplate: false,
      templateName: "",
    },
  });

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleFileAccepted(acceptedFiles[0]);
      }
    }
  });

  // Handle file acceptance
  const handleFileAccepted = (file: File) => {
    setFile(file);
    
    // Suggest a name based on the file
    const baseName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    form.setValue("name", `${baseName} (${form.getValues("marketplace")})`);
    
    // Automatically move to the next tab
    setActiveTab("details");
  };

  // Submit the feed for processing
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a file first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload progress simulation
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 100) {
            clearInterval(uploadInterval);
            return 100;
          }
          return newProgress;
        });
      }, 100);

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", data.name);
      formData.append("marketplace", data.marketplace);
      if (data.description) formData.append("description", data.description);
      if (data.saveTemplate && data.templateName) {
        formData.append("saveTemplate", "true");
        formData.append("templateName", data.templateName);
      }

      // Upload the file
      const response = await fetch("/api/feeds/upload", {
        method: "POST",
        body: formData,
      });
      
      clearInterval(uploadInterval);
      setUploadProgress(100);
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setFeedId(result.id);
      
      toast({
        title: "File uploaded",
        description: "Your file was uploaded successfully",
        variant: "success",
      });
      
      // Transition to processing
      setActiveTab("processing");
      startProcessingSimulation();
      
      // Invalidate the feeds query to update the feed list
      queryClient.invalidateQueries({ queryKey: ["/api/feeds"] });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Simulate the processing progress
  const startProcessingSimulation = () => {
    setProcessingStatus("processing");
    setProcessingProgress(0);
    
    processingRef.current = setInterval(() => {
      setProcessingProgress(prev => {
        // Generate processing progress with some realistic stall points
        const increment = Math.random() * 5;
        const newProgress = prev + increment;
        
        // Simulate process completion
        if (newProgress >= 100) {
          clearInterval(processingRef.current!);
          setProcessingStatus("completed");
          return 100;
        }
        
        // Simulate processing delay at common points
        if ((prev < 30 && newProgress >= 30) || 
            (prev < 70 && newProgress >= 70) || 
            (prev < 90 && newProgress >= 90)) {
          // Add realistic delays at key processing stages
          setTimeout(() => {
            setProcessingProgress(p => p + increment);
          }, 1500);
          return prev;
        }
        
        return newProgress;
      });
    }, 200);
  };
  
  // Clean up interval on unmount
  const resetProcess = () => {
    if (processingRef.current) {
      clearInterval(processingRef.current);
    }
    setFile(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingStatus("idle");
    setActiveTab("upload");
    form.reset();
  };
  
  // Handle view results
  const handleViewResults = () => {
    if (feedId) {
      window.location.href = `/feeds/${feedId}`;
    }
  };
  
  // Handle download
  const handleDownload = () => {
    if (feedId) {
      window.location.href = `/api/feeds/${feedId}/download`;
      
      toast({
        title: "Download started",
        description: "Your transformed file is being downloaded"
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create New Feed</h1>
        <p className="text-muted-foreground">Transform your product data for marketplace publishing</p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="upload" disabled={isUploading}>
            <FileUp className="h-4 w-4 mr-2" />
            Upload File
          </TabsTrigger>
          <TabsTrigger value="details" disabled={!file || isUploading}>
            <FileText className="h-4 w-4 mr-2" />
            Feed Details
          </TabsTrigger>
          <TabsTrigger value="processing" disabled={!feedId}>
            <FileOutput className="h-4 w-4 mr-2" />
            Processing
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Your Product Data</CardTitle>
              <CardDescription>
                Upload a CSV or Excel file with your product data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center gap-4">
                  <Upload className="h-10 w-10 text-gray-400" />
                  
                  {file ? (
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button 
                        className="mt-4"
                        onClick={() => setActiveTab("details")}
                      >
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1 text-center">
                        <p className="text-lg font-medium">
                          Drag & drop your file here
                        </p>
                        <p className="text-sm text-gray-500">
                          or click to browse your files
                        </p>
                      </div>
                      <Button variant="outline" onClick={(e) => e.stopPropagation()}>
                        Select File
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="mt-6">
                <h3 className="font-medium mb-2">Supported File Types</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>CSV files (.csv)</li>
                  <li>Excel files (.xls, .xlsx)</li>
                </ul>
              </div>
              
              <div className="mt-4">
                <h3 className="font-medium mb-2">Tips for Best Results</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                  <li>Make sure your file has column headers in the first row</li>
                  <li>Include SKU, price, and quantity columns for best results</li>
                  <li>Files under 10MB are processed faster</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feed Details</CardTitle>
              <CardDescription>
                Provide information about your feed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Feed Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My Product Feed" {...field} />
                          </FormControl>
                          <FormDescription>
                            A descriptive name for your feed
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="marketplace"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Marketplace</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a marketplace" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="amazon">Amazon</SelectItem>
                              <SelectItem value="walmart">Walmart</SelectItem>
                              <SelectItem value="catch">Catch/Mirkal</SelectItem>
                              <SelectItem value="meta">Meta/Facebook</SelectItem>
                              <SelectItem value="tiktok">TikTok</SelectItem>
                              <SelectItem value="reebelo">Reebelo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The marketplace where you'll publish these products
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Brief description of this feed" {...field} />
                        </FormControl>
                        <FormDescription>
                          A short note about this feed for your reference
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator />
                  
                  <div className="flex flex-col gap-4">
                    <Label className="font-medium">Selected File</Label>
                    {file && (
                      <div className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{file.name}</span>
                        <span className="text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setActiveTab("upload")}
                      disabled={isUploading}
                    >
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={!file || isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          Transform Feed <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {isUploading && (
                    <div className="space-y-2">
                      <Progress value={uploadProgress} />
                      <p className="text-xs text-center text-gray-500">
                        Uploading file... {uploadProgress}%
                      </p>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="processing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Your Data</CardTitle>
              <CardDescription>
                We're transforming your data for {form.getValues("marketplace")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">
                    {processingStatus === "completed" 
                      ? "Processing complete!"
                      : processingStatus === "processing"
                      ? "Processing in progress..."
                      : processingStatus === "error"
                      ? "Error processing feed"
                      : "Waiting to start processing..."
                    }
                  </span>
                  <span className="text-sm font-medium">{Math.round(processingProgress)}%</span>
                </div>
                <Progress value={processingProgress} />
              </div>
              
              <div className="border rounded-md p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {processingProgress >= 20 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : processingStatus === "processing" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">Initial data validation</h3>
                      <p className="text-sm text-gray-500">Validating data format and structure</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {processingProgress >= 40 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : processingProgress >= 20 ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">AI-powered data cleaning</h3>
                      <p className="text-sm text-gray-500">Using AI to clean and standardize your data</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {processingProgress >= 70 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : processingProgress >= 40 ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">Format transformation</h3>
                      <p className="text-sm text-gray-500">Converting to {form.getValues("marketplace")} format</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {processingProgress >= 90 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : processingProgress >= 70 ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">Field mapping verification</h3>
                      <p className="text-sm text-gray-500">Ensuring all required fields are present</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {processingProgress >= 100 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : processingProgress >= 90 ? (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">Final optimization</h3>
                      <p className="text-sm text-gray-500">Optimizing output for marketplace requirements</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {processingStatus === "completed" ? (
                <>
                  <Button variant="outline" onClick={resetProcess}>
                    Create Another Feed
                  </Button>
                  <div className="space-x-2">
                    <Button variant="outline" onClick={handleViewResults}>
                      View Results
                    </Button>
                    <Button onClick={handleDownload}>
                      Download Feed
                    </Button>
                  </div>
                </>
              ) : processingStatus === "error" ? (
                <>
                  <Button variant="outline" onClick={() => setActiveTab("upload")}>
                    Try Again
                  </Button>
                  <Button variant="destructive">
                    Report Issue
                  </Button>
                </>
              ) : (
                <div className="w-full text-center text-sm text-gray-500">
                  {processingProgress < 100 ? "Please wait while we process your data..." : "Processing complete!"}
                </div>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}