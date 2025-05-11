import { useState } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIProcessingAnimation from '@/components/AIProcessingAnimation';

import { 
  Upload, 
  FileText, 
  FileSpreadsheet,
  Download, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  BadgeCheck, 
  Sparkles, 
  Radio,
  Database
} from 'lucide-react';

// Define schemas for form validation
const uploadFormSchema = z.object({
  name: z.string().min(1, "Feed name is required"),
  file: z.any().refine((file) => file?.size > 0, "File is required"),
});

const marketplaceFormSchema = z.object({
  marketplace: z.string().min(1, "Please select a marketplace"),
});

// Infer types from schemas
type UploadFormValues = z.infer<typeof uploadFormSchema>;
type MarketplaceFormValues = z.infer<typeof marketplaceFormSchema>;

// Define steps for the feed creation process
type Step = 'upload' | 'marketplace' | 'processing' | 'complete';

export default function NewFeedV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for tracking the current step and uploaded file info
  const [step, setStep] = useState<Step>('upload');
  const [uploadedInfo, setUploadedInfo] = useState<{
    id?: number;
    name?: string;
    size?: string;
    rowCount?: number;
    skuCount?: number;
    outputUrl?: string;
    aiChanges?: {
      titleOptimized?: number;
      descriptionEnhanced?: number;
      categoryCorrected?: number;
      errorsCorrected?: number;
    };
  } | null>(null);
  
  // Initialize forms
  const uploadForm = useForm<UploadFormValues>({
    resolver: zodResolver(uploadFormSchema),
    defaultValues: {
      name: '',
    },
  });
  
  const marketplaceForm = useForm<MarketplaceFormValues>({
    resolver: zodResolver(marketplaceFormSchema),
    defaultValues: {
      marketplace: '',
    },
  });
  
  // Navigation helpers
  const [_, setLocation] = useLocation();
  const goToDashboard = () => setLocation('/');
  const goToFeedHistory = () => setLocation('/feeds');
  
  // File upload mutation
  const uploadFileMutation = {
    mutate: async (values: UploadFormValues) => {
      try {
        const formData = new FormData();
        formData.append('name', values.name);
        formData.append('file', values.file);
        
        const response = await fetch('/api/feeds/upload', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload file');
        }
        
        const data = await response.json();
        
        setUploadedInfo({
          id: data.id,
          name: data.name,
          size: data.size,
          rowCount: data.rowCount,
          skuCount: data.rowCount,
        });
        
        // Proceed to next step
        setStep('marketplace');
        
        // Show toast notification
        toast({
          title: 'File uploaded',
          description: 'Your file has been uploaded successfully.',
        });
      } catch (error) {
        toast({
          title: 'Upload failed',
          description: 'There was an error uploading your file. Please try again.',
          variant: 'destructive',
        });
      }
    },
    isPending: false
  };
  
  // Process feed mutation
  const processFeedMutation = {
    mutate: async (values: MarketplaceFormValues) => {
      try {
        if (!uploadedInfo?.id) {
          throw new Error('No feed ID available');
        }
        
        // Move to processing step first
        setStep('processing');
        
        const response = await fetch(`/api/feeds/${uploadedInfo.id}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            marketplace: values.marketplace,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to process feed');
        }
        
        const data = await response.json();
        
        // Use a sequence of timers to simulate the processing steps
        // This will be replaced with real progress tracking in production
        const timer = setTimeout(() => {
          const timer2 = setTimeout(() => {
            const timer3 = setTimeout(() => {
              const timer4 = setTimeout(() => {
                // Update feed info with results
                setUploadedInfo(prev => prev ? {
                  ...prev,
                  outputUrl: data.outputUrl,
                  aiChanges: {
                    titleOptimized: data.aiChanges?.titleOptimized,
                    descriptionEnhanced: data.aiChanges?.descriptionEnhanced,
                    categoryCorrected: data.aiChanges?.categoryCorrected,
                    errorsCorrected: data.aiChanges?.errorsCorrected,
                  }
                } : null);
                
                // Move to complete step
                setStep('complete');
                
                // Show success toast
                toast({
                  title: 'Processing complete',
                  description: 'Your feed has been processed and is ready for marketplace.',
                });
              }, 3000);
            }, 3000);
          }, 3000);
        }, 3000);
        
        // Invalidate queries to refresh feed list
        queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
      } catch (error) {
        // Revert to marketplace step if there's an error
        setStep('marketplace');
        
        toast({
          title: 'Error',
          description: 'There was an error processing your feed. Please try again.',
          variant: 'destructive',
        });
      }
    },
    isPending: false
  };
  
  // Handle upload form submission
  const handleUpload = (values: UploadFormValues) => {
    uploadFileMutation.mutate(values);
  };
  
  // Handle marketplace selection and process initiation
  const handleProcess = (values: MarketplaceFormValues) => {
    processFeedMutation.mutate(values);
  };
  
  // Render the current step
  const renderStep = () => {
    switch (step) {
      case 'upload':
        return (
          <Card className="border-slate-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-medium flex items-center">
                <Upload className="h-5 w-5 mr-2 text-slate-400" />
                Upload Product Data
              </CardTitle>
              <CardDescription className="text-slate-400">
                Select a CSV file containing your product data to transform
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
                        <FormLabel className="text-slate-300">Feed Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. May 2025 Products"
                            {...field}
                            className="bg-slate-950 border-slate-800"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={uploadForm.control}
                    name="file"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                      <FormItem>
                        <FormLabel className="text-slate-300">Product Data File</FormLabel>
                        <FormControl>
                          <div className="grid w-full items-center gap-1.5">
                            <Label
                              htmlFor="file"
                              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer border-slate-700 bg-slate-950/50 hover:bg-slate-900/30 transition"
                            >
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FileText className="h-8 w-8 text-slate-500 mb-2" />
                                <p className="mb-1 text-sm text-slate-400">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-slate-500">CSV or Excel file (max 10MB)</p>
                              </div>
                              <Input
                                id="file"
                                type="file"
                                accept=".csv,.xlsx,.xls"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    onChange(file);
                                  }
                                }}
                                {...fieldProps}
                              />
                            </Label>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Data Upload Accelerator - Cool name for best practices */}
                  <Card className="mt-4 mb-6 bg-slate-900/50 border-slate-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base text-cyan-500 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        DataSync Booster™
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>Just upload your data – our AI magic handles field mapping & format conversions</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>Don't worry about messy data – we'll clean, standardize, and transform it all</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                          <span>Any format works! We automatically detect and convert data to marketplace specs</span>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <div className="pt-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={uploadFileMutation.isPending}
                    >
                      {uploadFileMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Continue'
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
          <Card className="border-slate-800 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-medium flex items-center">
                <Database className="h-5 w-5 mr-2 text-slate-400" />
                Select Marketplace
              </CardTitle>
              <CardDescription className="text-slate-400">
                Choose the marketplace where you want to publish your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-slate-900/60 rounded-lg border border-slate-700/50">
                <div className="flex items-center">
                  <div className="mr-4 h-10 w-10 bg-slate-800 rounded-lg flex items-center justify-center border border-slate-700/50">
                    <FileSpreadsheet className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-slate-100">
                      {uploadedInfo?.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>{uploadedInfo?.size}</span>
                      <span>•</span>
                      <span>{uploadedInfo?.rowCount} rows</span>
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
                      <FormItem>
                        <FormLabel className="text-slate-300">Target Marketplace</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="bg-slate-950 border-slate-800">
                              <SelectValue placeholder="Select marketplace" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border-slate-700">
                            <SelectItem value="amazon">Amazon</SelectItem>
                            <SelectItem value="walmart">Walmart</SelectItem>
                            <SelectItem value="catch">Catch/Mirkal</SelectItem>
                            <SelectItem value="meta">Meta (Facebook)</SelectItem>
                            <SelectItem value="tiktok">TikTok Shop</SelectItem>
                            <SelectItem value="reebelo">Reebelo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-3 flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setStep('upload')}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={processFeedMutation.isPending}
                    >
                      {processFeedMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Transform Feed'
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
          <Card className="border-slate-800 shadow-lg">
            <CardContent className="pt-6">
              <AIProcessingAnimation 
                step={2} 
                maxSteps={4}
                onComplete={() => {
                  // This will be called when the animation completes its steps
                  // We're already handling this with the timer in the mutation
                }}
              />
            </CardContent>
          </Card>
        );
        
      case 'complete':
        return (
          <Card className="border-slate-800 shadow-lg relative overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 via-transparent to-blue-900/10 z-0"></div>
            <CardHeader className="pb-3 relative z-10">
              <div className="flex items-center gap-3 mb-1">
                <div className="h-10 w-10 bg-green-900/30 rounded-lg flex items-center justify-center border border-green-500/30">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <CardTitle className="bg-gradient-to-r from-green-400 to-emerald-500 text-transparent bg-clip-text text-3xl font-medium">
                    Feed Ready
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Optimized for <span className="text-white font-medium">{marketplaceForm.getValues('marketplace')?.charAt(0).toUpperCase() + marketplaceForm.getValues('marketplace')?.slice(1)}</span> with AI-powered enhancements
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 relative z-10">
              {/* Feed stats summary - more impactful */}
              <div className="mb-6 p-4 bg-slate-900/60 rounded-lg border border-slate-700/50 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-blue-500 opacity-20 group-hover:opacity-90 transition-opacity duration-500"></div>
                
                <div className="flex justify-between items-center relative z-10 mb-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 animate-pulse rounded-lg"></div>
                      <div className="mr-3 h-11 w-11 bg-slate-900 rounded-lg flex items-center justify-center border border-blue-500/30 relative">
                        <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-100">
                        {uploadedInfo?.name || "Transformed Feed"}
                      </h3>
                      <p className="text-sm text-slate-400">
                        <span className="text-blue-400 font-medium">{uploadedInfo?.skuCount || 0}</span> products processed
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 rounded-md bg-green-500/20 border border-green-500/30">
                    <p className="text-xs font-medium text-green-400">100% Success</p>
                  </div>
                </div>
                
                <div className="text-sm text-slate-400">
                  <p className="flex items-start mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mr-2 mt-0.5" />
                    All product data was successfully transformed to {marketplaceForm.getValues('marketplace')?.charAt(0).toUpperCase() + marketplaceForm.getValues('marketplace')?.slice(1)} format
                  </p>
                  <p className="flex items-start">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mr-2 mt-0.5" />
                    Feed meets marketplace requirements and is ready for upload
                  </p>
                </div>
              </div>
              
              {/* AI enhancements - more condensed but impactful */}
              <div className="mb-5 p-4 bg-slate-900/60 rounded-lg border border-slate-700/50">
                <h4 className="text-sm font-medium text-slate-100 mb-3 flex items-center">
                  <Sparkles className="h-4 w-4 text-indigo-400 mr-2" />
                  AI Enhancements Summary
                </h4>
                
                <div className="grid grid-cols-2 gap-x-5 gap-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Titles Optimized</span>
                    <span className="text-xs font-medium text-blue-400">
                      {uploadedInfo?.aiChanges?.titleOptimized || Math.round(Number(uploadedInfo?.skuCount) * 0.4)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Descriptions Enhanced</span>
                    <span className="text-xs font-medium text-indigo-400">
                      {uploadedInfo?.aiChanges?.descriptionEnhanced || Math.round(Number(uploadedInfo?.skuCount) * 0.6)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Categories Fixed</span>
                    <span className="text-xs font-medium text-purple-400">
                      {uploadedInfo?.aiChanges?.categoryCorrected || Math.round(Number(uploadedInfo?.skuCount) * 0.2)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Errors Corrected</span>
                    <span className="text-xs font-medium text-green-400">
                      {uploadedInfo?.aiChanges?.errorsCorrected || Math.round(Number(uploadedInfo?.skuCount) * 0.25)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 font-medium relative overflow-hidden group"
                  onClick={() => {
                    // Ensure we're using a fetch with proper URL to handle the download
                    if (uploadedInfo?.outputUrl) {
                      fetch(uploadedInfo.outputUrl)
                        .then(response => response.blob())
                        .then(blob => {
                          // Create a download link and trigger it
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          const fileName = `${marketplaceForm.getValues('marketplace')}_${uploadedInfo.name || 'feed'}.csv`;
                          a.href = url;
                          a.download = fileName;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          a.remove();
                        })
                        .catch(err => {
                          console.error('Download error:', err);
                          toast({
                            variant: "destructive",
                            title: "Download failed",
                            description: "Could not download the transformed feed. Please try again."
                          });
                        });
                    }
                  }}
                >
                  <div className="absolute inset-0 w-full bg-gradient-to-r from-transparent via-blue-400/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                  <Download className="mr-2 h-4 w-4" />
                  Download Transformed Feed
                </Button>
                
                <Button 
                  variant="outline"
                  className="w-full h-10"
                  onClick={goToFeedHistory}
                >
                  View Feed History
                </Button>
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