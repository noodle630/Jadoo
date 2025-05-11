import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FileUploaderProps {
  onFileAccepted: (file: File) => void;
  isUploading?: boolean;
  progress?: number;
  error?: string;
}

export default function FileUploader({ 
  onFileAccepted, 
  isUploading = false,
  progress = 0,
  error
}: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setSelectedFile(file);
      onFileAccepted(file);
    }
  }, [onFileAccepted]);

  const { 
    getRootProps, 
    getInputProps, 
    isDragActive,
    isDragReject
  } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  return (
    <div className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${isDragReject ? 'border-destructive bg-destructive/5' : ''}
          ${isUploading ? 'pointer-events-none opacity-70' : ''}
          bg-gray-50
        `}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 text-muted-foreground mb-2 mx-auto" />
        
        {selectedFile && !isUploading ? (
          <div>
            <p className="text-sm font-medium mb-1">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground mb-2">
              {isDragActive 
                ? "Drop your CSV file here" 
                : "Drag and drop your CSV file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">Max file size: 100MB</p>
          </>
        )}
        
        {isUploading && (
          <div className="mt-4">
            <Progress value={progress} className="h-2 mb-2" />
            <p className="text-xs text-muted-foreground">Uploading: {progress}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
