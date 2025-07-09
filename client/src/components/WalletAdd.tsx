import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface WalletAddProps {
  userId: string;
  onSuccess?: () => void;
}

export default function WalletAdd({ userId, onSuccess }: WalletAddProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAddFunds = async (amount: number) => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/wallet/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount: amount
        }),
      });

      const data = await response.json();

      if (response.ok && data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url;
      } else {
        throw new Error(data.message || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Wallet add error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add funds to wallet',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Add Funds to Wallet</CardTitle>
        <CardDescription>
          Choose an amount to add to your wallet for processing credits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => handleAddFunds(10)}
            disabled={isLoading}
            className="h-16 text-lg font-semibold"
          >
            $10
          </Button>
          <Button
            onClick={() => handleAddFunds(20)}
            disabled={isLoading}
            className="h-16 text-lg font-semibold"
          >
            $20
          </Button>
        </div>
        
        {isLoading && (
          <div className="text-center text-sm text-muted-foreground">
            Redirecting to checkout...
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center">
          Secure payment powered by Stripe
        </div>
      </CardContent>
    </Card>
  );
} 