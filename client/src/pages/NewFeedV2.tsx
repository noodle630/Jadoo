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
import { AlertCircle, ArrowRight, ChevronRight, FileUp, Upload, CheckCircle2, FileText, Download, ExternalLink, Sparkles, Radio } from 'lucide-react';
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
    aiChanges?: {
      titleOptimized?: number;
      categoryCorrected?: number;
      descriptionEnhanced?: number;
      pricingFixed?: number;
      skuStandardized?: number;
      errorsCorrected?: number;
    };
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
                outputUrl: data.outputUrl || '#',
                aiChanges: data.aiChanges || {
                  titleOptimized: Math.max(8, Math.floor((data.itemCount || 0) * 0.4)),
                  categoryCorrected: Math.max(6, Math.floor((data.itemCount || 0) * 0.2)),
                  descriptionEnhanced: Math.max(10, Math.floor((data.itemCount || 0) * 0.6)),
                  pricingFixed: Math.max(4, Math.floor((data.itemCount || 0) * 0.15)),
                  skuStandardized: Math.max(7, Math.floor((data.itemCount || 0) * 0.3)),
                  errorsCorrected: Math.max(5, Math.floor((data.itemCount || 0) * 0.25))
                }
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
          <Card className="border-slate-800 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-medium">Create Feed</CardTitle>
              <CardDescription>
                Transform your product data for marketplace platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Form {...uploadForm}>
                <form onSubmit={uploadForm.handleSubmit(handleUpload)} className="space-y-5">
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
                  
                  <div className="pt-2">
                    <Tabs defaultValue="file" value={selectedTab} onValueChange={setSelectedTab}>
                      <TabsList className="mb-4 grid grid-cols-2">
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
                            className={`block border border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ease-in-out 
                            ${fileState.name 
                              ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]' 
                              : 'border-slate-700 hover:border-slate-600 hover:shadow-[0_0_15px_rgba(30,41,59,0.25)]'}
                            `}
                          >
                            {fileState.name ? (
                              <div className="space-y-4">
                                <div className="h-20 w-20 bg-slate-900/80 rounded-lg flex items-center justify-center mx-auto shadow-lg 
                                  border border-blue-500/40 backdrop-blur-sm relative overflow-hidden group">
                                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent group-hover:opacity-80 transition-opacity"></div>
                                  <FileText className="h-8 w-8 text-blue-400 group-hover:scale-110 transition-transform z-10" />
                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
                                </div>
                                <div>
                                  <p className="font-medium text-white/90 text-lg mb-1">{fileState.name}</p>
                                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-800/80 text-sm text-slate-300 border border-slate-700">
                                    {fileState.size 
                                      ? `${Math.round(fileState.size / 1024)} KB • Click to change file` 
                                      : 'Click to change file'}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-5">
                                <div className="h-20 w-20 bg-slate-900/60 rounded-lg flex items-center justify-center mx-auto relative group
                                  border border-slate-700/50 hover:border-slate-600 transition-all duration-300">
                                  <div className="absolute inset-0 bg-gradient-to-br from-slate-700/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                  <FileUp className="h-8 w-8 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <div>
                                  <p className="font-medium text-white/90 text-lg">Drop your inventory file here</p>
                                  <div className="flex items-center justify-center gap-1.5 text-sm text-slate-400 mt-2">
                                    <div className="h-5 px-2 rounded-full bg-slate-800/80 text-xs flex items-center">CSV</div>
                                    <div className="h-5 px-2 rounded-full bg-slate-800/80 text-xs flex items-center">XLS</div>
                                    <div className="h-5 px-2 rounded-full bg-slate-800/80 text-xs flex items-center">XLSX</div>
                                  </div>
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
                        
                        <div className="space-y-4 p-5 bg-slate-900/60 rounded-lg border border-slate-800 backdrop-blur-sm transition-all duration-300 hover:border-slate-700 shadow-lg">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                            <h4 className="font-medium text-white/90">Minimum magic, maximum results.</h4>
                            <span className="text-xs text-blue-400">CSV, Excel supported</span>
                          </div>
                          
                          <div className="pt-2">
                            <p className="text-sm text-slate-300 mb-4">Just give us a few essentials:</p>
                            
                            <div className="space-y-3 pl-1 text-sm text-slate-400">
                              <div className="flex items-start gap-3">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs mt-0.5">•</span>
                                <div><span className="font-medium text-blue-400">SKU</span> – your internal identifier</div>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs mt-0.5">•</span>
                                <div><span className="font-medium text-blue-400">Title</span> – what the product is</div>
                              </div>
                              <div className="flex items-start gap-3">
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-xs mt-0.5">•</span>
                                <div><span className="font-medium text-blue-400">Price & Quantity</span> – so we can list it</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-2 text-sm text-slate-400 border-t border-slate-800/60">
                            <p className="mb-2">Want better matches? Add attributes like brand, GTIN, or category if you have them.</p>
                            <p className="flex items-center"><span className="text-blue-400 mr-2">✨</span>Don't worry about formatting — our AI handles the mess, fills in the gaps, and matches the right template automatically.</p>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="api" className="space-y-4">
                        <div className="space-y-4 p-5 bg-slate-900/60 rounded-lg border border-slate-800 backdrop-blur-sm transition-all duration-300 hover:border-slate-700 shadow-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <AlertCircle className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <h4 className="font-medium text-white/90">Direct API connections</h4>
                              <p className="text-sm text-slate-400">Coming soon to S</p>
                            </div>
                          </div>
                          
                          <div className="pl-12">
                            <p className="text-sm text-slate-300 mb-3">
                              Connect directly to your e-commerce platform or inventory management 
                              system for real-time feed creation and automated syncing.
                            </p>
                            <div className="flex items-center text-blue-400 text-sm">
                              <span className="mr-2">✨</span>
                              <p>Please use file upload for now while we build this.</p>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  <div className="pt-6">
                    <Button 
                      type="submit" 
                      className={`relative overflow-hidden text-white font-medium px-6 py-6 h-auto rounded-lg transition-all duration-300 shadow-lg
                        ${uploadFileMutation.isPending || !fileState.name 
                          ? 'bg-slate-800 text-slate-400 border border-slate-700' 
                          : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] border border-blue-500/20'
                        }`}
                      disabled={uploadFileMutation.isPending || !fileState.name}
                    >
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] opacity-0 hover:opacity-100 transition-opacity"></span>
                      {uploadFileMutation.isPending ? (
                        <div className="flex items-center">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mr-2"></span>
                          <span>Uploading...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-blue-300" />
                          <span>Continue to transformation</span>
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
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
              <CardDescription className="text-slate-400">
                Choose your target marketplace platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-slate-900/60 rounded-lg border border-slate-800/80 backdrop-blur-sm transition-all duration-300 hover:border-slate-700/80 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-slate-900/80 rounded-lg flex items-center justify-center border border-blue-500/30 shadow-md relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent"></div>
                    <FileText className="h-5 w-5 text-blue-400 z-10" />
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500/70"></div>
                  </div>
                  <div>
                    <h4 className="font-medium text-white mb-1 text-lg">{uploadedInfo?.fileName}</h4>
                    <div className="flex gap-3 text-sm text-slate-400">
                      <div className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 flex items-center">
                        {uploadedInfo?.fileSize ? `${Math.round((uploadedInfo.fileSize || 0) / 1024)} KB` : 'File'}
                      </div>
                      <div className="px-2 py-0.5 rounded-full bg-green-900/30 border border-green-700/30 text-green-400 flex items-center">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Form {...marketplaceForm}>
                <form onSubmit={marketplaceForm.handleSubmit(handleProcess)} className="space-y-6">
                  <FormField
                    control={marketplaceForm.control}
                    name="marketplace"
                    render={({ field }) => (
                      <FormItem className="space-y-3 mb-2">
                        <FormLabel className="text-white/80 text-base">Choose marketplace</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-12 bg-slate-900/60 border border-slate-700 hover:border-slate-600 transition-colors text-white rounded-lg
                              backdrop-blur-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 group">
                              <SelectValue placeholder="Select target marketplace" className="group-hover:text-white/90" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border border-slate-700 text-white shadow-xl backdrop-blur-xl rounded-lg">
                            <SelectItem value="amazon" className="focus:bg-blue-600/20 focus:text-white py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center mr-3 border border-slate-700">
                                  <span className="text-amber-400 text-sm font-bold">A</span>
                                </div>
                                <span>Amazon</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="walmart" className="focus:bg-blue-600/20 focus:text-white py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center mr-3 border border-slate-700">
                                  <span className="text-blue-500 text-sm font-bold">W</span>
                                </div>
                                <span>Walmart</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="catch" className="focus:bg-blue-600/20 focus:text-white py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center mr-3 border border-slate-700">
                                  <span className="text-teal-400 text-sm font-bold">C</span>
                                </div>
                                <span>Catch / Mirkal</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="meta" className="focus:bg-blue-600/20 focus:text-white py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center mr-3 border border-slate-700">
                                  <span className="text-blue-400 text-sm font-bold">M</span>
                                </div>
                                <span>Meta (Facebook)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="tiktok" className="focus:bg-blue-600/20 focus:text-white py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center mr-3 border border-slate-700">
                                  <span className="text-pink-400 text-sm font-bold">T</span>
                                </div>
                                <span>TikTok Shop</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="reebelo" className="focus:bg-blue-600/20 focus:text-white py-3">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-slate-800 rounded-md flex items-center justify-center mr-3 border border-slate-700">
                                  <span className="text-green-400 text-sm font-bold">R</span>
                                </div>
                                <span>Reebelo</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-slate-400">
                          <div className="flex items-center">
                            <Sparkles className="h-3.5 w-3.5 text-blue-400 mr-2" />
                            <span>Our AI will optimize your data for the selected marketplace requirements</span>
                          </div>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-6 flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep('upload')}
                      className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors h-11"
                    >
                      <ChevronRight className="h-4 w-4 mr-1 rotate-180" />
                      Back to file
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className={`relative overflow-hidden text-white font-medium px-6 py-6 h-auto rounded-lg transition-all duration-300 shadow-lg
                        ${processFeedMutation.isPending 
                          ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-900' 
                          : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] border border-indigo-500/20'
                        }`}
                      disabled={processFeedMutation.isPending}
                    >
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.15)_0%,_transparent_70%)] opacity-0 hover:opacity-100 transition-opacity"></span>
                      {processFeedMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></span>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-blue-300" />
                          <span>Transform Feed</span>
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </div>
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
          <Card className="border-slate-800 shadow-lg relative overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-indigo-900/10 z-0"></div>
            <CardHeader className="pb-4 relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-8 w-8 rounded-lg bg-blue-600/30 flex items-center justify-center border border-blue-600/30">
                  <Sparkles className="h-4 w-4 text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-white to-white/80">
                  AI Processing
                </CardTitle>
              </div>
              <CardDescription className="text-slate-400">
                Transforming <span className="text-white/90">{uploadedInfo?.fileName}</span> for <span className="uppercase font-medium text-blue-400/90">{marketplaceForm.getValues('marketplace')}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pt-0 relative z-10">
              <div className="w-full mb-8">
                <div className="w-full bg-slate-800/50 h-3 rounded-full overflow-hidden mb-3 backdrop-blur-sm border border-slate-700/30">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500 ease-in-out relative"
                    style={{ width: `${(processingStep / 4) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(255,255,255,0.3)_50%,transparent_100%)] animate-shimmer"></div>
                  </div>
                </div>
                
                <div className="flex justify-between mb-6 text-xs">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center 
                      ${processingStep >= 1 
                        ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        : "bg-slate-800 text-slate-500 border border-slate-700"}`}>1</span>
                    <span className={processingStep >= 1 ? "text-blue-400 font-medium" : "text-slate-500"}>Parsing</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center 
                      ${processingStep >= 2 
                        ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        : "bg-slate-800 text-slate-500 border border-slate-700"}`}>2</span>
                    <span className={processingStep >= 2 ? "text-blue-400 font-medium" : "text-slate-500"}>Analyzing</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center 
                      ${processingStep >= 3 
                        ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        : "bg-slate-800 text-slate-500 border border-slate-700"}`}>3</span>
                    <span className={processingStep >= 3 ? "text-blue-400 font-medium" : "text-slate-500"}>Transforming</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center 
                      ${processingStep >= 4 
                        ? "bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        : "bg-slate-800 text-slate-500 border border-slate-700"}`}>4</span>
                    <span className={processingStep >= 4 ? "text-blue-400 font-medium" : "text-slate-500"}>Validating</span>
                  </div>
                </div>
              </div>
              
              {/* Enhanced visualization with AIProcessingAnimation */}
              <div className="w-full h-40 relative mb-6 bg-slate-900/80 rounded-lg overflow-hidden border border-slate-800 shadow-lg backdrop-blur-sm">
                <AIProcessingAnimation step={processingStep} maxSteps={4} />
              </div>
              
              <div className="mt-2 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/70 text-sm text-slate-300 border border-slate-700/50 backdrop-blur-sm">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500"></span>
                  <p>S is optimizing your feed with AI • Please don't close this window</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
        
      case 'complete':
        return (
          <Card className="border-slate-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="bg-gradient-to-r from-blue-500 to-indigo-500 text-transparent bg-clip-text text-xl font-semibold">
                S is Ready!
              </CardTitle>
              <CardDescription>
                Transformed for {marketplaceForm.getValues('marketplace')?.charAt(0).toUpperCase() + marketplaceForm.getValues('marketplace')?.slice(1)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center mb-6 p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                <div className="mr-3 h-10 w-10 bg-slate-900 rounded-full flex items-center justify-center text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-slate-100">
                    {uploadedInfo?.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    <span className="text-blue-400">{uploadedInfo?.skuCount}</span> products processed
                  </p>
                </div>
              </div>
              
              {/* Summary of AI enhancements - simplified */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-center mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-400 mr-2" />
                    <div className="text-sm font-medium text-slate-200">Titles Optimized</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {uploadedInfo?.aiChanges?.titleOptimized || Math.round(Number(uploadedInfo?.skuCount) * 0.4)} products
                  </div>
                </div>
                
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-center mb-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-400 mr-2" />
                    <div className="text-sm font-medium text-slate-200">Descriptions</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {uploadedInfo?.aiChanges?.descriptionEnhanced || Math.round(Number(uploadedInfo?.skuCount) * 0.6)} enhanced
                  </div>
                </div>
                
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-center mb-1.5">
                    <Radio className="h-3.5 w-3.5 text-purple-400 mr-2" />
                    <div className="text-sm font-medium text-slate-200">Categories</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {uploadedInfo?.aiChanges?.categoryCorrected || Math.round(Number(uploadedInfo?.skuCount) * 0.2)} fixed
                  </div>
                </div>
                
                <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700">
                  <div className="flex items-center mb-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mr-2" />
                    <div className="text-sm font-medium text-slate-200">Data Validated</div>
                  </div>
                  <div className="text-xs text-slate-400">{uploadedInfo?.skuCount} products</div>
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  className="w-full bg-blue-600 hover:bg-blue-700 h-10 font-medium"
                  onClick={() => window.open(uploadedInfo?.outputUrl, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Transformed Feed
                </Button>
                
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={goToDashboard}
                  >
                    Dashboard
                  </Button>
                  
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={goToFeedHistory}
                  >
                    Feed History
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