import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { TierSelector } from './TierSelector';
import { Progress } from './ui/progress';
import Papa from 'papaparse';

export function SimplifiedUpload() {
  const [selectedTier, setSelectedTier] = useState('free');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [rowCount, setRowCount] = useState(0);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.type === 'text/csv') {
      setFile(file);
      setStatus('idle');
      // Parse CSV to count rows
      Papa.parse(file, {
        complete: (results) => {
          setRowCount(results.data.length - 1); // minus header
        },
      });
    } else {
      setStatus('error');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setStatus('uploading');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('platform', 'walmart');
    formData.append('email', 'test@example.com');
    formData.append('tier', selectedTier);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/simple-upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        setStatus('success');
        console.log('Upload successful:', result);
        // Trigger download if downloadUrl is present
        if (result.downloadUrl) {
          window.location.href = result.downloadUrl;
          return;
        }
        // Stripe checkout for paid tiers
        if (selectedTier !== 'free') {
          const stripeRes = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              plan: selectedTier,
              rowCount: rowCount
            })
          });
          if (stripeRes.ok) {
            const { url } = await stripeRes.json();
            if (url) {
              window.location.href = url;
              return;
            }
          } else {
            setStatus('error');
            throw new Error('Stripe checkout failed');
          }
        }
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setProgress(0);
    setStatus('idle');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Transform Your Product Feed</h1>
        <p className="text-gray-600">Upload your CSV and get an optimized Walmart feed in minutes</p>
      </div>

      {/* Tier Selection */}
      <div>
        <h2 className="text-xl font-semibold mb-4 text-center">Choose Your Plan</h2>
        <TierSelector 
          selectedTier={selectedTier} 
          onTierSelect={setSelectedTier} 
        />
      </div>

      {/* Upload Area */}
      <Card className="border-2 border-dashed border-gray-300">
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : ''
            }`}
          >
            <input {...getInputProps()} />
            
            {!file ? (
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop your CSV file here' : 'Drag & drop your CSV file'}
                  </p>
                  <p className="text-gray-500">or click to browse</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <FileText className="mx-auto h-8 w-8 text-green-500" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      {uploading && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Processing your feed...</span>
                <span className="text-sm text-gray-500">{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Messages */}
      {status === 'success' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium text-green-800">Upload successful!</p>
                <p className="text-sm text-green-600">Your feed is being processed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'error' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <p className="font-medium text-red-800">Upload failed</p>
                <p className="text-sm text-red-600">Please try again with a valid CSV file</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        {file && !uploading && status !== 'success' && (
          <Button onClick={handleUpload} className="px-8">
            Process Feed
          </Button>
        )}
        
        {status === 'success' && (
          <Button onClick={resetUpload} variant="outline">
            Upload Another File
          </Button>
        )}
        
        {status === 'error' && (
          <Button onClick={resetUpload} variant="outline">
            Try Again
          </Button>
        )}
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="text-center">
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-blue-600 font-bold">⚡</span>
          </div>
          <h3 className="font-semibold mb-2">Lightning Fast</h3>
          <p className="text-sm text-gray-600">Process 100+ products in under 30 seconds</p>
        </div>
        
        <div className="text-center">
          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-600 font-bold">🎯</span>
          </div>
          <h3 className="font-semibold mb-2">Optimized for Sales</h3>
          <p className="text-sm text-gray-600">SEO-optimized content that converts</p>
        </div>
        
        <div className="text-center">
          <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-purple-600 font-bold">🛡️</span>
          </div>
          <h3 className="font-semibold mb-2">Error-Free</h3>
          <p className="text-sm text-gray-600">Validated data that meets marketplace requirements</p>
        </div>
      </div>
    </div>
  );
} 