import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { PackageOpen, Upload, FileCheck, AlertCircle, HelpCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { HoverCard, HoverCardContent, HoverCardTrigger, } from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
export default function ProductsImport() {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStep, setUploadStep] = useState('idle');
    const [uploadedFile, setUploadedFile] = useState(null);
    // Sample accepted file formats
    const acceptedFormats = {
        'text/csv': ['.csv'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    };
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            setUploadedFile(acceptedFiles[0]);
            // Mock upload process
            setIsUploading(true);
            setUploadStep('uploading');
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                setUploadProgress(progress);
                if (progress === 100) {
                    clearInterval(interval);
                    setUploadStep('processing');
                    setTimeout(() => {
                        setUploadStep('completed');
                        setIsUploading(false);
                        toast({
                            title: "Import successful",
                            description: `${acceptedFiles[0].name} has been imported successfully.`,
                        });
                    }, 2000);
                }
            }, 100);
        }
    }, [toast]);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: acceptedFormats,
        maxFiles: 1,
        disabled: isUploading
    });
    const renderUploadState = () => {
        switch (uploadStep) {
            case 'uploading':
                return (<div className="space-y-4 text-center">
            <div className="animate-pulse">
              <Upload className="h-12 w-12 mx-auto text-primary"/>
            </div>
            <div>
              <h3 className="text-lg font-medium">Uploading file...</h3>
              <p className="text-sm text-muted-foreground">{uploadedFile === null || uploadedFile === void 0 ? void 0 : uploadedFile.name}</p>
            </div>
            <Progress value={uploadProgress} className="w-full max-w-md mx-auto h-2"/>
            <p className="text-sm text-muted-foreground">{uploadProgress}% complete</p>
          </div>);
            case 'processing':
                return (<div className="space-y-4 text-center">
            <div className="animate-spin-slow">
              <FileCheck className="h-12 w-12 mx-auto text-primary"/>
            </div>
            <div>
              <h3 className="text-lg font-medium">Processing your data</h3>
              <p className="text-sm text-muted-foreground">AI is analyzing your product data...</p>
            </div>
          </div>);
            case 'completed':
                return (<div className="space-y-4 text-center">
            <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-full inline-block mx-auto">
              <FileCheck className="h-12 w-12 text-green-600 dark:text-green-500"/>
            </div>
            <div>
              <h3 className="text-lg font-medium">Import Successful</h3>
              <p className="text-sm text-muted-foreground">{uploadedFile === null || uploadedFile === void 0 ? void 0 : uploadedFile.name} has been processed</p>
            </div>
            <div className="flex flex-col gap-2 items-center">
              <Badge className="bg-green-600">Ready for marketplaces</Badge>
              <Badge variant="outline" className="bg-primary/10">
                <div className="flex items-center gap-1">
                  <span className="text-xs">Enhanced by AI</span>
                </div>
              </Badge>
            </div>
            <div className="pt-4">
              <Button onClick={() => setUploadStep('idle')}>Import Another File</Button>
            </div>
          </div>);
            case 'error':
                return (<div className="space-y-4 text-center">
            <div className="bg-red-100 dark:bg-red-900/20 p-3 rounded-full inline-block mx-auto">
              <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-500"/>
            </div>
            <div>
              <h3 className="text-lg font-medium">Import Failed</h3>
              <p className="text-sm text-muted-foreground">There was an error processing your file</p>
            </div>
            <div className="pt-4">
              <Button onClick={() => setUploadStep('idle')}>Try Again</Button>
            </div>
          </div>);
            default:
                return (<div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer hover:bg-muted/50
            ${isDragActive ? "border-primary bg-primary/10" : "border-muted"}`}>
            <input {...getInputProps()}/>
            <div className="space-y-4">
              <div className="bg-primary/10 p-3 rounded-full inline-block">
                <Upload className="h-10 w-10 text-primary"/>
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {isDragActive ? "Drop file here" : "Drag & drop product data file"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  or <span className="text-primary font-medium">browse files</span>
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Supports CSV, Excel (.xls, .xlsx)
              </div>
            </div>
          </div>);
        }
    };
    return (<div className="p-6">
      <Card className="border-slate-200 dark:border-slate-700 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/70 via-primary to-primary/70"></div>
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <PackageOpen className="mr-2 h-6 w-6 text-primary"/>
                <span className="bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-100 dark:to-white bg-clip-text text-transparent">
                  Import Products
                </span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                Upload product data to add to your inventory
              </CardDescription>
            </div>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-4 w-4"/>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Importing Products</h4>
                  <p className="text-sm text-muted-foreground">
                    Upload your product data in CSV or Excel format. Our AI will analyze and clean your data automatically.
                  </p>
                  <div className="pt-2">
                    <p className="text-xs font-medium">Recommended columns:</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 pt-1 space-y-1">
                      <li>SKU (required)</li>
                      <li>Name/Title (required)</li>
                      <li>Description</li>
                      <li>Price</li>
                      <li>Quantity</li>
                      <li>Images</li>
                    </ul>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {renderUploadState()}
        </CardContent>
        <CardFooter className="flex justify-between border-t mt-6 bg-muted/20">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">Pro Tip:</span> Our AI will automatically enhance your product data for marketplace optimization
          </p>
        </CardFooter>
      </Card>
    </div>);
}
