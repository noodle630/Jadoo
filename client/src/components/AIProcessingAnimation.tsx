import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface AIProcessingAnimationProps {
  step?: number;
  maxSteps?: number;
  insights?: string[];
  onComplete?: () => void;
}

export default function AIProcessingAnimation({
  step = 1,
  maxSteps = 4,
  insights = [],
  onComplete
}: AIProcessingAnimationProps) {
  const [localStep, setLocalStep] = useState(step);
  const [localInsights, setLocalInsights] = useState<string[]>(insights);
  const [currentInsight, setCurrentInsight] = useState<string | null>(null);
  
  // Default insights if none provided
  const defaultInsights = [
    "Analyzing your product data structure...",
    "Identifying SKUs and key attributes...",
    "Mapping fields to marketplace format...",
    "Filling missing required data...",
    "Standardizing measurement units...",
    "Cleaning and formatting product titles...",
    "Optimizing descriptions for marketplace...",
    "Converting currencies if needed...",
    "Validating against platform requirements...",
    "Generating schema-compliant output..."
  ];
  
  // Auto-progress steps for demo purposes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localStep < maxSteps) {
        setLocalStep(prev => prev + 1);
      } else if (onComplete) {
        onComplete();
      }
    }, 4000);
    
    return () => clearTimeout(timer);
  }, [localStep, maxSteps, onComplete]);
  
  // Display random insights
  useEffect(() => {
    const insightsToUse = localInsights.length > 0 ? localInsights : defaultInsights;
    const intervalId = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * insightsToUse.length);
      setCurrentInsight(insightsToUse[randomIndex]);
    }, 2500);
    
    return () => clearInterval(intervalId);
  }, [localInsights]);
  
  // Progress value for the progress bar
  const progress = (localStep / maxSteps) * 100;
  
  return (
    <div className="relative w-full max-w-lg mx-auto h-44 overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5"></div>
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-blue-400/20 via-indigo-500/20 to-purple-500/20"
          animate={{
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6">        
        {/* Status text */}
        <h3 className="text-xl font-medium text-white mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {localStep === maxSteps ? 'Products Ready to Sell 💲🚀' : 'Processing Data'}
        </h3>
        
        {/* Current insight */}
        <div className="h-6 flex items-center justify-center mb-5">
          <motion.p
            key={currentInsight} // Force animation to restart when text changes
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-slate-300 text-center"
          >
            {localStep === maxSteps ? 'Validating against platform requirements...' : currentInsight}
          </motion.p>
        </div>
        
        {/* Modern progress bar */}
        <div className="w-full max-w-sm relative">
          <div className="relative h-2 w-full bg-slate-800/70 rounded-full overflow-hidden">
            {/* Progress fill */}
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full relative overflow-hidden"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            >
              {/* Shimmer effect inside progress */}
              <motion.div 
                className="absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                style={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
          
          {/* Progress percentage - aligned better */}
          <div className="mt-2 text-xs text-center text-slate-400">
            <span className="text-blue-400">{Math.round(progress)}%</span> complete
          </div>
        </div>
      </div>
    </div>
  );
}