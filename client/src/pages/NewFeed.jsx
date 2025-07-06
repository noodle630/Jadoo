var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowRight, ChevronRight, FileUp, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
// Simplify the initial form schema - just name and file
const initialFormSchema = z.object({
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
export default function NewFeed() {
    const [selectedTab, setSelectedTab] = useState('file');
    const [currentStep, setCurrentStep] = useState('upload');
    const [uploadedInfo, setUploadedInfo] = useState(null);
    const [processingStep, setProcessingStep] = useState(1);
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const [fileState, setFileState] = useState({
        name: null,
        preview: null,
        loading: false,
    });
    // Setup form with validation
    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            marketplace: '',
        },
    });
    // Setup mutation for form submission
    const createFeedMutation = useMutation({
        mutationFn: (values) => __awaiter(this, void 0, void 0, function* () {
            const formData = new FormData();
            formData.append('name', values.name);
            formData.append('marketplace', values.marketplace);
            formData.append('file', values.file);
            // API request to upload file and create feed
            const response = yield fetch('/api/feeds/upload', {
                method: 'POST',
                body: formData,
            })
                .then(res => res.json());
            return response;
        }),
        onSuccess: (data) => {
            // Invalidate queries to refresh feed list
            queryClient.invalidateQueries({ queryKey: ['/api/feeds'] });
            // Show success message
            toast({
                title: 'Feed created',
                description: 'Your feed has been created successfully.',
            });
            // Navigate to feed processing view
            navigate(`/feeds/${data.id}`);
        },
        onError: () => {
            toast({
                title: 'Error',
                description: 'There was an error creating your feed. Please try again.',
                variant: 'destructive',
            });
        },
    });
    // Handle form submission
    const onSubmit = (values) => {
        createFeedMutation.mutate(values);
    };
    // Handle file drop and selection
    const handleFileChange = (e) => {
        var _a;
        if (!((_a = e.target.files) === null || _a === void 0 ? void 0 : _a[0]))
            return;
        const file = e.target.files[0];
        form.setValue('file', file, { shouldValidate: true });
        setFileState({
            name: file.name,
            preview: URL.createObjectURL(file),
            loading: false,
        });
    };
    return (<div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center mb-8 text-sm text-slate-500 dark:text-slate-400">
        <span className="hover:text-slate-800 dark:hover:text-slate-200" onClick={() => navigate('/')}>
          Dashboard
        </span>
        <ChevronRight className="h-4 w-4 mx-1"/>
        <span className="font-medium text-slate-900 dark:text-white">Create Feed</span>
      </div>
      
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Create Feed</CardTitle>
          <CardDescription>
            Transform your product data for marketplace platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem>
                      <FormLabel>Feed Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer Collection 2025" {...field}/>
                      </FormControl>
                      <FormDescription>
                        A descriptive name for this product feed
                      </FormDescription>
                      <FormMessage />
                    </FormItem>)}/>
                
                <FormField control={form.control} name="marketplace" render={({ field }) => (<FormItem>
                      <FormLabel>Target Marketplace</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select marketplace"/>
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
                        The platform you're creating this feed for
                      </FormDescription>
                      <FormMessage />
                    </FormItem>)}/>
              </div>
              
              <div className="pt-4">
                <Tabs defaultValue="file" value={selectedTab} onValueChange={setSelectedTab}>
                  <TabsList className="mb-6 grid grid-cols-2">
                    <TabsTrigger value="file" className="flex items-center gap-2">
                      <FileUp className="h-4 w-4"/>
                      <span>File Upload</span>
                    </TabsTrigger>
                    <TabsTrigger value="api" className="flex items-center gap-2">
                      <Upload className="h-4 w-4"/>
                      <span>API Connection</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="file" className="space-y-4">
                    <div className="relative">
                      <label htmlFor="file-upload" className={`block border-2 border-dashed rounded-lg p-10 text-center cursor-pointer ${fileState.name
            ? 'border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
            : 'border-slate-300 dark:border-slate-700'}`}>
                        {fileState.name ? (<div className="space-y-3">
                            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                              <FileUp className="h-6 w-6 text-blue-600 dark:text-blue-400"/>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{fileState.name}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">Click to change file</p>
                            </div>
                          </div>) : (<div className="space-y-3">
                            <div className="h-12 w-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                              <FileUp className="h-6 w-6 text-slate-500 dark:text-slate-400"/>
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">Drop your CSV file here</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">or click to browse</p>
                            </div>
                          </div>)}
                      </label>
                      <input id="file-upload" type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleFileChange}/>
                    </div>
                    
                    <FormField control={form.control} name="file" render={() => (<FormItem>
                          <FormControl>
                            <Input type="file" className="hidden"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>)}/>
                    
                    <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-slate-900 dark:text-white">Upload Tips</h4>
                        <span className="text-xs text-slate-400">Supported: CSV, Excel (.xls, .xlsx)</span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
                        <p className="flex items-center">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Keep it simple - we only need a <span className="font-medium text-blue-600 dark:text-blue-400">SKU</span> to identify your products
                        </p>
                        <p className="flex items-center">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Basic info like <span className="font-medium text-blue-600 dark:text-blue-400">price</span> and <span className="font-medium text-blue-600 dark:text-blue-400">quantity</span> are helpful
                        </p>
                        <p className="flex items-center">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500 mr-2"></span>
                          Don't worry about formatting - our AI will handle the rest 💫
                        </p>
                      </div>
                      
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                        <p>Having product identifiers like UPC, GTIN, or ASIN helps our system match your products more accurately, but they're not required.</p>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="api" className="space-y-4">
                    <Alert variant="warning">
                      <AlertCircle className="h-4 w-4"/>
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
                <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" disabled={createFeedMutation.isPending}>
                  {createFeedMutation.isPending ? (<>Processing...</>) : (<>
                      Create Feed
                      <ArrowRight className="ml-2 h-4 w-4"/>
                    </>)}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>);
}
