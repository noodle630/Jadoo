import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowRight, ChevronRight, FileUp, Upload, CheckCircle2, FileText, RadioTower, Download, ExternalLink, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AIProcessingAnimation from '@/components/AIProcessingAnimation';

// Simplify the initial form schema - just name and file
const uploadFormSchema = z.object({
  name: z.string().min(3, {
    message: 'Feed name must be at least 3 characters.',
  }),
  file: z.any()
    .refine((file) => file instanceof File, {
      message: 'Please upload a file.',
    })
});

// Schema for the marketplace selection step
const marketplaceFormSchema = z.object({
  marketplace: z.string({
    required_error: 'Please select a marketplace.',
  }),
});

type UploadFormValues = z.infer<typeof uploadFormSchema>;
type MarketplaceFormValues = z.infer<typeof marketplaceFormSchema>;

// Define feed creation process steps
type Step = 'upload' | 'marketplace' | 'processing' | 'complete';

export default function NewFeedV2() {
  const [selectedTab, setSelectedTab] = useState('file');
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadedInfo, setUploadedInfo] = useState<{
    name: string;
    fileId?: string;
    fileName: string;
    fileSize?: number;
    feedId?: number;
    skuCount?: number;
    outputUrl?: string;
  } | null>(null);
  const [processingStep, setProcessingStep] = useState(1);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [fileState, setFileState] = useState<{
    name: string | null;
    preview: string | null;
    loading: boolean;
    size?: number;
  }>({
    name: null,
    preview: null,
    loading: false,
  });
  
  // Setup upload form with validation
  const uploadForm = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      name: '',
    },
  });
  
  // Setup marketplace form with validation
  const marketplaceForm = useForm<MarketplaceFormValues>({
    resolver: zodResolver(marketplaceFormSchema),
    defaultValues: {
      marketplace: '',
    },
  });
  
  // Setup mutation for initial file upload - just the file and name
  const uploadFileMutation = useMutation({
    mutationFn: async (values: UploadFormValues) => {
      const formData = new FormData();
      formData.append('name', values.name);
      formData.append('file', values.file);
      
      // Temporarily store as "pending" until marketplace selection
      formData.append('status', 'pending');
      
      // API request to upload file
      const response = await fetch('/api/feeds/upload', {
        method: 'POST',
        body: formData,
      })
      .then(res => res.json());
      
      return response;
    },
    onSuccess: (data) => {
      // Move to marketplace selection step
      setUploadedInfo({
        name: uploadForm.getValues('name'),
        fileName: fileState.name || 'Unknown file',
        fileSize: fileState.size,
        feedId: data.id
      });
      
      setCurrentStep('marketplace');
      
      // Show success message
      toast({
        title: 'File uploaded',
        description: 'Your file has been uploaded successfully. Now select your target marketplace.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error uploading your file. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Setup mutation for processing the feed with selected marketplace
  const processFeedMutation = useMutation({
    mutationFn: async (values: MarketplaceFormValues) => {
      // API request to process the feed
      const response = await fetch(`/api/feeds/${uploadedInfo?.feedId}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          marketplace: values.marketplace,
        }),
      })
      .then(res => res.json());
      
      return response;
    },
    onSuccess: (data) => {
      // Start the processing animation
      setCurrentStep('processing');
      
      // Simulate the processing steps
      const timer = setTimeout(() => {
        setProcessingStep(2);
        
        const timer2 = setTimeout(() => {
          setProcessingStep(3);
          
          const timer3 = setTimeout(() => {
            setProcessingStep(4);
            
            const timer4 = setTimeout(() => {
              // Set the processing complete
              setCurrentStep('complete');
              
              // Update the uploaded info with the result data
              setUploadedInfo(prev => prev ? {
                ...prev,
                skuCount: data.itemCount || 0,
                outputUrl: data.outputUrl || '#'
              } : null);
              
              // Show success message
              toast({
                title: 'Processing complete',
                description: 'Your feed has been processed and is ready for marketplace.',
              });
            }, 3000);
            
            return () => clearTimeout(timer4);
          }, 3000);
          
          return () => clearTimeout(timer3);
        }, 3000);
        
        return () => clearTimeout(timer2);
      }, 3000);
      
      // Invalidate queries to refresh feed list
      queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
      
      return () => clearTimeout(timer);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'There was an error processing your feed. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle upload form submission
  const handleUpload = (values: UploadFormValues) => {
    uploadFileMutation.mutate(values);
  };
  
  // Handle marketplace form submission
  const handleProcess = (values: MarketplaceFormValues) => {
    processFeedMutation.mutate(values);
  };
  
  // Handle file drop and selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    uploadForm.setValue('file', file, { shouldValidate: true });
    
    setFileState({
      name: file.name,
      preview: URL.createObjectURL(file),
      loading: false,
      size: file.size
    });
  };
  
  // Function to go back to dashboard
  const goToDashboard = () => {
    navigate('/');
  };
  
  // Function to go to feed history
  const goToFeedHistory = () => {
    navigate('/history');
  };
  
  // Render the appropriate step UI
  const renderStep = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Create Feed</CardTitle>
              <CardDescription>
                Transform your product data for marketplace platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-6">
                  <FormField
                    control={uploadForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Feed Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Summer Collection 2025" {...field} />
                        </FormControl>
                        <FormDescription>
                          A descriptive name for this product feed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4">
                    <Tabs defaultValue="file" value={selectedTab} onValueChange={setSelectedTab}>
                      <TabsList className="mb-6 grid grid-cols-2">
                        <TabsTrigger value="file" className="flex items-center gap-2">
                          <FileUp className="h-4 w-4" />
                          <span>File Upload</span>
                        </TabsTrigger>
                        <TabsTrigger value="api" className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span>API Connection</span>
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="file" className="space-y-4">
                        <div className="relative">
                          <label 
                            htmlFor="file-upload"
                            className={`block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer ${
                              fileState.name 
                                ? 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' 
                                : 'border-slate-300 dark:border-slate-700'
                            }`}
                          >
                            {fileState.name ? (
                              <div className="space-y-3">
                                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                                  <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">{fileState.name}</p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {fileState.size 
                                      ? `${Math.round(fileState.size / 1024)} KB • Click to change file` 
                                      : 'Click to change file'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                                  <FileUp className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">Drop your CSV file here</p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse</p>
                                </div>
                              </div>
                            )}
                          </label>
                          <input 
                            id="file-upload"
                            type="file" 
                            accept=".csv,.xls,.xlsx" 
                            className="hidden" 
                            onChange={handleFileChange}
                          />
                        </div>
                        
                        <FormField
                          control={uploadForm.control}
                          name="file"
                          render={() => (
                            <FormItem className="hidden">
                              <FormControl>
                                <Input type="file" className="hidden" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-slate-900 dark:text-white">Upload Tips</h4>
                            <span className="text-xs text-slate-400">Supported: CSV, Excel (.xls, .xlsx)</span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <p className="flex items-center">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                              Keep it simple — we only need a <span className="font-medium text-blue-600 dark:text-blue-400">SKU</span> to identify your products
                            </p>
                            <p className="flex items-center">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                              Include <span className="font-medium text-blue-600 dark:text-blue-400">price</span> and <span className="font-medium text-blue-600 dark:text-blue-400">quantity</span> for best results
                            </p>
                            <p className="flex items-center">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                              Don't worry about formatting — our AI handles that for you ✨
                            </p>
                          </div>
                          
                          <div className="mt-3 text-xs text-slate-500 dark:text-slate-500">
                            <p>Product identifiers like UPC, GTIN, or ASIN help match your products more accurately but aren't required.</p>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="api" className="space-y-4">
                        <Alert variant="default" className="bg-slate-900 border-slate-800">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>API connection coming soon</AlertTitle>
                          <AlertDescription>
                            Connect directly to your e-commerce platform or inventory management system for real-time feed creation.
                            This feature is currently in development.
                          </AlertDescription>
                        </Alert>
                        
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          <p>Please use file upload for now.</p>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={uploadFileMutation.isPending || !fileState.name}
                    >
                      {uploadFileMutation.isPending ? (
                        <>Uploading...</>
                      ) : (
                        <>
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        );
        
      case 'marketplace':
        return (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Target Marketplace</CardTitle>
              <CardDescription>
                Select the platform where you want to list your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">{uploadedInfo?.fileName}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {uploadedInfo?.fileSize 
                        ? `${Math.round((uploadedInfo.fileSize || 0) / 1024)} KB • Ready to process` 
                        : 'Ready to process'}
                    </p>
                  </div>
                </div>
              </div>
              
              <Form {...marketplaceForm}>
                <form onSubmit={marketplaceForm.handleSubmit(handleProcess)} className="space-y-6">
                  <FormField
                    control={marketplaceForm.control}
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
                              <SelectValue placeholder="Select marketplace" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="amazon">Amazon</SelectItem>
                            <SelectItem value="walmart">Walmart</SelectItem>
                            <SelectItem value="catch">Catch / Mirkal</SelectItem>
                            <SelectItem value="meta">Meta (Facebook)</SelectItem>
                            <SelectItem value="tiktok">TikTok Shop</SelectItem>
                            <SelectItem value="reebelo">Reebelo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Each marketplace has different data requirements that our AI will optimize for
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-4 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep('upload')}
                    >
                      Back
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      disabled={processFeedMutation.isPending}
                    >
                      {processFeedMutation.isPending ? (
                        <>Processing...</>
                      ) : (
                        <>
                          Process Feed
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        );
        
      case 'processing':
        return (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Processing Feed</CardTitle>
              <CardDescription>
                Our AI is transforming your data for {marketplaceForm.getValues('marketplace')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="w-full max-w-lg mb-6">
                <AIProcessingAnimation 
                  step={processingStep} 
                  maxSteps={4}
                />
              </div>
              
              <div className="w-full mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                <p>This may take a few minutes. Please don't close the browser.</p>
              </div>
            </CardContent>
          </Card>
        );
        
      case 'complete':
        return (
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle className="bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text text-2xl font-bold">
                S is Ready!
              </CardTitle>
              <CardDescription>
                Your data has been magically transformed for {marketplaceForm.getValues('marketplace')?.charAt(0).toUpperCase() + marketplaceForm.getValues('marketplace')?.slice(1)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center mb-8">
                <div className="relative mb-4">
                  {/* Success animation */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-75 blur-sm animate-pulse"></div>
                  <div className="relative h-20 w-20 bg-slate-900 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-slate-100 mb-2">
                  {uploadedInfo?.name}
                </h3>
                <p className="text-slate-400">
                  <span className="font-semibold text-blue-400">{uploadedInfo?.skuCount}</span> products processed successfully
                </p>
              </div>
              
              {/* Enhancement summary */}
              <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 mb-6">
                <h4 className="font-medium text-slate-100 mb-3">AI Enhanced Your Data</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-blue-900/60 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-blue-400" /> 
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-300">Titles Optimized</div>
                      <div className="text-xs text-slate-500">{Math.round(Number(uploadedInfo?.skuCount) * 0.3)} products</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-900/60 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-indigo-400" /> 
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-300">Descriptions Enhanced</div>
                      <div className="text-xs text-slate-500">{Math.round(Number(uploadedInfo?.skuCount) * 0.5)} products</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-purple-900/60 flex items-center justify-center">
                      <RadioTower className="h-4 w-4 text-purple-400" /> 
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-300">Categories Fixed</div>
                      <div className="text-xs text-slate-500">{Math.round(Number(uploadedInfo?.skuCount) * 0.2)} products</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-green-900/60 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-400" /> 
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-300">Data Validated</div>
                      <div className="text-xs text-slate-500">{uploadedInfo?.skuCount} products</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <h4 className="font-medium text-slate-200">Source</h4>
                  </div>
                  <p className="text-sm text-slate-400">
                    {uploadedInfo?.fileName} ({Math.round((uploadedInfo?.fileSize || 0) / 1024)} KB)
                  </p>
                </div>
                
                <div className="p-4 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <RadioTower className="h-4 w-4 text-slate-400" />
                    <h4 className="font-medium text-slate-200">Marketplace Format</h4>
                  </div>
                  <p className="text-sm text-slate-400 capitalize flex items-center">
                    {marketplaceForm.getValues('marketplace')} Product Feed
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-12 font-medium"
                  onClick={() => window.open(uploadedInfo?.outputUrl, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Transformed Feed
                </Button>
                
                <div className="flex items-center gap-4">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={goToDashboard}
                  >
                    Go to Dashboard
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={goToFeedHistory}
                  >
                    View Feed History
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
    }
  };
  
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center mb-8 text-sm text-slate-500 dark:text-slate-400">
        <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer" onClick={goToDashboard}>
          Dashboard
        </span>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="font-medium text-slate-900 dark:text-white">Create Feed</span>
      </div>
      
      {renderStep()}
    </div>
  );
}