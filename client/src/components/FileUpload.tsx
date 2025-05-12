import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileUploadProps {
  onFileAccepted: (file: File) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number; // in bytes
  allowMultiple?: boolean;
  status?: UploadStatus;
  progress?: number;
  error?: string;
}

export default function FileUpload({
  onFileAccepted,
  acceptedFileTypes = ['.csv', '.xlsx', '.xls'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowMultiple = false,
  status = 'idle',
  progress = 0,
  error = '',
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        setSelectedFile(file);
        onFileAccepted(file);
      }
    },
    [onFileAccepted]
  );

  const removeFile = () => {
    setSelectedFile(null);
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => {
      // Handle common types
      if (type === '.csv') acc['text/csv'] = ['.csv'];
      if (type === '.xlsx' || type === '.xls') {
        acc['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] = ['.xlsx'];
        acc['application/vnd.ms-excel'] = ['.xls'];
      }
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: maxFileSize,
    multiple: allowMultiple,
  });

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <Alert key={file.name} variant="destructive" className="mt-2 bg-red-900/20 border-red-800">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        <p className="text-sm font-medium">{file.name}</p>
        <ul className="text-xs mt-1 text-red-300">
          {errors.map(e => (
            <li key={e.code}>{e.message}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  ));

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="w-full">
      {selectedFile && status !== 'error' ? (
        <Card className="p-4 border-gray-700 bg-gray-800">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <File className="h-5 w-5 text-blue-400 mr-2" />
              <div>
                <p className="text-sm font-medium truncate max-w-[250px]">{selectedFile.name}</p>
                <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            {status === 'idle' && (
              <Button variant="ghost" size="sm" onClick={removeFile} className="text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </Button>
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
          </div>
          {status === 'uploading' && (
            <div className="mt-2">
              <Progress value={progress} className="h-1 bg-gray-700" indicatorClassName="bg-blue-500" />
              <p className="text-xs text-gray-400 mt-1">Uploading: {progress}%</p>
            </div>
          )}
        </Card>
      ) : (
        <>
          <div
            {...getRootProps()}
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-500 bg-blue-900/10'
                : status === 'error'
                ? 'border-red-600 bg-red-900/10'
                : 'border-gray-700 bg-gray-900/50 hover:border-blue-500 hover:bg-blue-900/10'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className={`h-10 w-10 mb-4 ${status === 'error' ? 'text-red-500' : 'text-gray-500'}`} />
            <p className="text-sm text-center text-gray-400 mb-2">
              {isDragActive
                ? 'Drop the file here...'
                : `Drag & drop your ${acceptedFileTypes.join(', ')} file here`}
            </p>
            <p className="text-xs text-center text-gray-500 mb-4">or</p>
            <Button className="bg-blue-600 hover:bg-blue-700">Browse Files</Button>
            <p className="text-xs text-center text-gray-500 mt-4">
              {acceptedFileTypes.join(', ')} up to {formatFileSize(maxFileSize)}
            </p>
          </div>

          {status === 'error' && error && (
            <Alert variant="destructive" className="mt-4 bg-red-900/20 border-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {fileRejectionItems.length > 0 && (
            <div className="mt-4">{fileRejectionItems}</div>
          )}
        </>
      )}
    </div>
  );
}