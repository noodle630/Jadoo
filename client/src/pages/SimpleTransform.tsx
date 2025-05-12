import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileText, Upload, Download } from 'lucide-react';

export default function SimpleTransform() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [marketplace, setMarketplace] = useState<string>('amazon');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      
      // Validate file is a CSV
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV file',
          variant: 'destructive',
        });
        return;
      }
      
      setFile(selectedFile);
      setResult(null); // Clear previous results
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to transform',
        variant: 'destructive',
      });
      return;
    }
    
    setIsUploading(true);
    setProgress(10);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('marketplace', marketplace);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 5;
          return newProgress < 90 ? newProgress : prev;
        });
      }, 500);
      
      // Using the direct transform API endpoint
      const response = await fetch('/api/transform/csv', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${await response.text()}`);
      }
      
      // Check if it's a download response or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // Handle JSON response
        const data = await response.json();
        setResult(data);
        setProgress(100);
        
        toast({
          title: 'Transformation completed',
          description: `Successfully transformed ${data.input_rows} rows to ${data.output_rows} rows`,
        });
      } else {
        // Handle file download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        // Determine filename from content-disposition header if available
        let filename = `transformed_${marketplace}_${file.name}`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        
        // Create a download link and click it
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        
        setProgress(100);
        setResult({
          success: true,
          filename,
          input_file: file.name,
          marketplace
        });
        
        toast({
          title: 'Transformation completed',
          description: 'Download started automatically',
        });
      }
    } catch (error) {
      console.error('Error transforming file:', error);
      toast({
        title: 'Transformation failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Direct CSV Transformation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload your product data and transform it for any marketplace with 1:1 row mapping
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a marketplace and upload your CSV file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="marketplace">Target Marketplace</Label>
                  <Select 
                    value={marketplace} 
                    onValueChange={setMarketplace}
                  >
                    <SelectTrigger id="marketplace" className="w-full">
                      <SelectValue placeholder="Select marketplace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="walmart">Walmart</SelectItem>
                      <SelectItem value="catch">Catch/Mirkal</SelectItem>
                      <SelectItem value="meta">Meta/Facebook</SelectItem>
                      <SelectItem value="tiktok">TikTok</SelectItem>
                      <SelectItem value="reebelo">Reebelo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="file">CSV File</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                      ${file ? 'border-green-500/50 bg-green-50/50 dark:border-green-500/30 dark:bg-green-950/20' : 
                      'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600'}`}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <input 
                      type="file" 
                      id="file-input" 
                      accept=".csv" 
                      onChange={handleFileChange} 
                      className="hidden"
                      disabled={isUploading}
                    />
                    
                    <div className="flex flex-col items-center justify-center gap-2">
                      {file ? (
                        <>
                          <FileText className="h-8 w-8 text-green-500 dark:text-green-400" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                          <div>
                            <p className="font-medium">Click to upload CSV file</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              CSV files only, max 10MB
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {progress > 0 && progress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Processing...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={!file || isUploading}
                >
                  {isUploading ? 'Processing...' : 'Transform CSV'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        {/* Info Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Transformation Info</CardTitle>
              <CardDescription>
                About the direct transformation process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-1">1:1 Row Mapping</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Our system guarantees that every input row produces exactly one output row with the target format.
                </p>
              </div>
              
              {result && result.success && (
                <div className="mt-4 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900">
                  <h3 className="text-base font-medium text-green-800 dark:text-green-400 mb-2">
                    Transformation Successful
                  </h3>
                  {result.input_rows && result.output_rows && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Transformed {result.input_rows} input rows to {result.output_rows} output rows
                    </p>
                  )}
                  {result.filename && (
                    <div className="flex items-center gap-2 mt-2">
                      <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {result.filename}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}