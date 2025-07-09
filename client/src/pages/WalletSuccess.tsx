import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function WalletSuccess() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [amount, setAmount] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const amountParam = urlParams.get('amount');
    const userIdParam = urlParams.get('user_id');

    if (amountParam) setAmount(amountParam);
    if (userIdParam) setUserId(userIdParam);

    // Show success toast
    toast({
      title: 'Payment Successful!',
      description: `Successfully added $${amountParam} to your wallet`,
    });
  }, [toast]);

  const handleContinue = () => {
    // Navigate back to the main app
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">Payment Successful!</CardTitle>
          <CardDescription>
            Your wallet has been topped up successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900">${amount}</div>
            <div className="text-sm text-gray-500">Added to your wallet</div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">What's next?</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Your credits are now available for processing</li>
              <li>• You can upload and transform your product feeds</li>
              <li>• Credits will be deducted based on your processing tier</li>
            </ul>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleContinue}
              className="w-full"
            >
              Continue to Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to App
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 