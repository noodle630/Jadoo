import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FileText, Upload } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Transform() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [file, setFile] = useState<File | null>(null);
  const [marketplace, setMarketplace] = useState<string>('amazon');
  const [uploading, setUploading] = useState<boolean>(false);
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
    
    setUploading(true);
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
          description: `Successfully transformed ${data.input_rows} rows`,
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
      setUploading(false);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-100 dark:to-white bg-clip-text text-transparent">
            Transform Product Data
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload your product data CSV and transform it for any supported marketplace
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>Upload CSV File</CardTitle>
              <CardDescription>
                Select a marketplace and upload your product data CSV file
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
                    <SelectTrigger className="w-full">
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
                  <Label htmlFor="file">Product Data CSV</Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${file ? 'border-green-500/20 bg-green-50/20 dark:border-green-800/30 dark:bg-green-900/10' : 
                      'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'}`}
                    onClick={() => document.getElementById('fileInput')?.click()}
                  >
                    <input 
                      type="file" 
                      id="fileInput" 
                      accept=".csv" 
                      onChange={handleFileChange} 
                      className="hidden"
                      disabled={uploading}
                    />
                    
                    <div className="flex flex-col items-center justify-center gap-2">
                      {file ? (
                        <>
                          <FileUpload className="h-8 w-8 text-green-500 dark:text-green-400" />
                          <div>
                            <p className="font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                          <div>
                            <p className="font-medium">Click to upload CSV file</p>
                            <p className="text-xs text-muted-foreground">
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
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  disabled={!file || uploading}
                >
                  {uploading ? 'Processing...' : 'Transform Data'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader>
              <CardTitle>Transformation Info</CardTitle>
              <CardDescription>
                Information about the transformation process
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">Guaranteed Row Preservation</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Our transformation engine maintains a perfect 1:1 mapping between input and output rows.
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-1">AI-Powered Transformation</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Advanced AI automatically maps your product data to the target marketplace's required format.
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-1">Supported File Size</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Files up to 10MB and 1000 rows are supported. For larger files, please contact support.
                </p>
              </div>
            </CardContent>
          </Card>
          
          {result && result.success && (
            <Card className="border-green-200 dark:border-green-800 shadow-sm mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Transformation Successful</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {result.input_rows && result.output_rows && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Transformed {result.input_rows} rows into {result.output_rows} rows
                  </p>
                )}
                {result.filename && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Downloaded: {result.filename}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}