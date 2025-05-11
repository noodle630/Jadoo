import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";

interface AIProcessingAnimationProps {
  progress: number;
  message?: string;
}

export default function AIProcessingAnimation({ progress, message }: AIProcessingAnimationProps) {
  const [dots, setDots] = useState('.');
  const [insights, setInsights] = useState<string[]>([]);
  
  // Array of AI insights that will appear during processing
  const possibleInsights = [
    "Analyzing product categories...",
    "Optimizing product titles...",
    "Enhancing descriptions...",
    "Standardizing attribute formats...",
    "Validating inventory quantities...",
    "Cross-referencing prices...",
    "Formatting images for marketplace...",
    "Generating SKU mappings...",
    "Fixing missing attributes...",
    "Ensuring compliance with marketplace standards..."
  ];
  
  // Animate the loading dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '.';
        return prev + '.';
      });
    }, 400);
    
    return () => clearInterval(interval);
  }, []);
  
  // Add insights as the progress increases
  useEffect(() => {
    const thresholds = [10, 25, 40, 55, 70, 85, 95];
    
    // Add a new insight when progress crosses a threshold
    for (const threshold of thresholds) {
      if (progress >= threshold && insights.length < thresholds.indexOf(threshold) + 1) {
        // Select a random insight that hasn't been shown yet
        const availableInsights = possibleInsights.filter(insight => !insights.includes(insight));
        if (availableInsights.length > 0) {
          const randomInsight = availableInsights[Math.floor(Math.random() * availableInsights.length)];
          setInsights(prev => [...prev, randomInsight]);
        }
      }
    }
  }, [progress, insights]);
  
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="pt-6 pb-8 px-0">
        <div className="max-w-lg mx-auto">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Main animated icon */}
            <div className="relative mb-8">
              {/* Pulsing glow background */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-full blur-xl animate-pulse"></div>
              
              {/* Spinning circles */}
              <div className="relative h-32 w-32">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-900/30 opacity-20"></div>
                <div className="absolute inset-2 rounded-full border-4 border-t-blue-600 dark:border-t-blue-400 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <div className="absolute inset-4 rounded-full border-4 border-r-indigo-600 dark:border-r-indigo-400 border-t-transparent border-b-transparent border-l-transparent animate-spin-slow"></div>
                <div className="absolute inset-6 rounded-full border-4 border-b-blue-500 dark:border-b-blue-400 border-t-transparent border-r-transparent border-l-transparent animate-spin-slower"></div>
                
                {/* Center icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 flex items-center justify-center shadow-lg">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                      <path d="M12 4.5C7 4.5 2.5 8 2.5 13.5C2.5 19 7 21.5 12 21.5C17 21.5 21.5 19 21.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M21.5 7.5V2.5H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M16.5 7.5L21.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Floating particles */}
              <div className="absolute top-1/2 left-0 h-2 w-2 rounded-full bg-blue-400 animate-float opacity-70"></div>
              <div className="absolute top-1/4 right-1/4 h-3 w-3 rounded-full bg-indigo-400 animate-float-slow opacity-70"></div>
              <div className="absolute bottom-1/3 right-0 h-2 w-2 rounded-full bg-blue-300 animate-float-slower opacity-70"></div>
            </div>
            
            {/* Progress message */}
            <div>
              <h3 className="text-xl font-medium mb-1 text-slate-900 dark:text-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                {message || "AI Magic in Progress"}
                <span className="inline-block w-8">{dots}</span>
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {progress < 100 ? 'Transforming your data into marketplace-ready feeds' : 'Transformation complete!'}
              </p>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            
            {/* Progress percentage */}
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {progress}% Complete
            </div>
            
            {/* AI insights */}
            <div className="mt-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800 w-full">
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1.5">
                  <path d="M9 21.5L21.5 9C21.7761 8.72387 21.7761 8.27613 21.5 8L16 2.5C15.7239 2.22387 15.2761 2.22387 15 2.5L2.5 15L8.5 21.5C8.77614 21.7761 9.22386 21.7761 9.5 21.5H9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M15 9L9 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.5 15L8.5 21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                AI Insights
              </h4>
              <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                {insights.length > 0 ? (
                  insights.map((insight, index) => (
                    <div key={index} className="flex items-start">
                      <div className="flex-shrink-0 h-4 w-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5 mr-2">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-600 dark:text-green-400">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span>{insight}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-slate-500 dark:text-slate-500 italic">
                    Processing will begin shortly...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}