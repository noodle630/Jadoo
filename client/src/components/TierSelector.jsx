import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Check } from 'lucide-react';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    products: '10 products',
    fillRate: '30% fields filled',
    features: [
      'Basic product info',
      'Essential fields only',
      'GPT-4o-mini model',
      'Community support'
    ],
    popular: false,
    color: 'border-gray-200'
  },
  {
    id: 'basic',
    name: 'Basic',
    price: '$29',
    period: 'per month',
    products: '100 products',
    fillRate: '60% fields filled',
    features: [
      'Standard optimization',
      'Extended field coverage',
      'SEO optimization',
      'Email support',
      'Priority processing'
    ],
    popular: true,
    color: 'border-blue-500'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$99',
    period: 'per month',
    products: '1000 products',
    fillRate: '90% fields filled',
    features: [
      'Full optimization',
      'Complete field coverage',
      'Advanced SEO',
      'Brand optimization',
      'Priority support',
      'Analytics dashboard'
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
              <span className="text-gray-500 ml-1">{tier.period}</span>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              <div>{tier.products}</div>
              <div>{tier.fillRate}</div>
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