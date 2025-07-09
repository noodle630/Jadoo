import React from 'react';
import WalletAdd from '@/components/WalletAdd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function WalletTest() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Wallet Test</h1>
          <p className="text-gray-600">Test the wallet top-up functionality with Stripe</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Add Funds to Wallet</CardTitle>
              <CardDescription>
                Click the buttons below to test the Stripe checkout flow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalletAdd userId="test123" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                The complete wallet top-up flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">1. Click Add Funds</h3>
                <p className="text-sm text-gray-600">
                  Choose $10 or $20 to add to your wallet
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">2. Stripe Checkout</h3>
                <p className="text-sm text-gray-600">
                  You'll be redirected to Stripe's secure checkout page
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">3. Payment Processing</h3>
                <p className="text-sm text-gray-600">
                  Enter your payment details and complete the transaction
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-medium">4. Success/Cancel</h3>
                <p className="text-sm text-gray-600">
                  You'll be redirected back to success or cancel page
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Test URLs</CardTitle>
              <CardDescription>
                You can also test these URLs directly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm">
                <strong>Success Page:</strong> 
                <a href="/wallet/success?amount=10&user_id=test123" className="text-blue-600 hover:underline ml-2">
                  /wallet/success?amount=10&user_id=test123
                </a>
              </div>
              <div className="text-sm">
                <strong>Cancel Page:</strong> 
                <a href="/wallet/cancel" className="text-blue-600 hover:underline ml-2">
                  /wallet/cancel
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 