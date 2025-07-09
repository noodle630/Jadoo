import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Check } from 'lucide-react';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    per: 'up to 100 rows',
    features: [
      'Up to 100 products free',
      'Basic AI optimization',
      'Standard processing speed',
      'Email support',
      'CSV export'
    ],
    popular: false,
    color: 'border-gray-200'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$0.10',
    per: 'per row (101-500)',
    features: [
      'Up to 500 products',
      'Advanced AI optimization',
      'Priority processing',
      'Live chat support',
      'Advanced analytics',
      'API access',
      'Bulk operations'
    ],
    popular: true,
    color: 'border-blue-500'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$0.35',
    per: 'per row (501-1000)',
    features: [
      'Up to 1000 products',
      'Custom AI models',
      'Dedicated processing',
      '24/7 phone support',
      'Advanced integrations',
      'White-label solution',
      'Custom workflows',
      'SLA guarantee'
    ],
    popular: false,
    color: 'border-purple-500'
  }
];

export function TierSelector({ selectedTier, onTierSelect }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
      {tiers.map((tier) => (
        <Card 
          key={tier.id}
          className={`relative cursor-pointer transition-all hover:shadow-lg ${
            selectedTier === tier.id ? 'ring-2 ring-blue-500' : ''
          } ${tier.color}`}
          onClick={() => onTierSelect(tier.id)}
        >
          {tier.popular && (
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
              Most Popular
            </Badge>
          )}
          
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold">{tier.name}</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">{tier.price}</span>
              <span className="text-gray-500 ml-1">{tier.per}</span>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 