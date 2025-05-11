import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Database, Zap, FileText, CheckCircle2 } from 'lucide-react';

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
  
  // Animation-related states
  const [particles, setParticles] = useState<{id: number, x: number, y: number, size: number, speed: number, color: string}[]>([]);
  
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
  
  // Create random particles for the animation
  useEffect(() => {
    const particleCount = 50;
    const newParticles = [];
    const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#F59E0B', '#10B981'];
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 5 + 1,
        speed: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }
    
    setParticles(newParticles);
  }, []);
  
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
        <h3 className="text-xl font-medium text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {localStep === maxSteps ? 'Feed Ready' : 'Processing Data'}
        </h3>
        
        {/* Current insight */}
        <div className="h-8 flex items-center justify-center">
          <motion.p
            key={currentInsight} // Force animation to restart when text changes
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-slate-300 text-center"
          >
            {currentInsight}
          </motion.p>
        </div>
        
        {/* Progress bar */}
        <div className="w-full mt-3 max-w-xs relative">
          <div className="absolute h-1 w-full bg-slate-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </div>
          
          {/* Step indicators */}
          <div className="relative pt-4 flex justify-between w-full">
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full mb-1 ${
                localStep > 1 
                  ? 'bg-blue-500 text-white' 
                  : localStep === 1 
                    ? 'bg-blue-500/50 text-white ring-2 ring-blue-400/30' 
                    : 'bg-slate-800 text-slate-500'
              }`}>
                <span className="text-xs font-medium">1</span>
              </div>
              <span className={`text-xs ${
                localStep >= 1 
                  ? 'text-blue-400' 
                  : 'text-slate-500'
              }`}>Parse</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full mb-1 ${
                localStep > 2 
                  ? 'bg-blue-500 text-white' 
                  : localStep === 2 
                    ? 'bg-blue-500/50 text-white ring-2 ring-blue-400/30' 
                    : 'bg-slate-800 text-slate-500'
              }`}>
                <span className="text-xs font-medium">2</span>
              </div>
              <span className={`text-xs ${
                localStep >= 2 
                  ? 'text-blue-400' 
                  : 'text-slate-500'
              }`}>Transform</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full mb-1 ${
                localStep > 3 
                  ? 'bg-purple-500 text-white' 
                  : localStep === 3 
                    ? 'bg-purple-500/50 text-white ring-2 ring-purple-400/30' 
                    : 'bg-slate-800 text-slate-500'
              }`}>
                <span className="text-xs font-medium">3</span>
              </div>
              <span className={`text-xs ${
                localStep >= 3 
                  ? 'text-purple-400' 
                  : 'text-slate-500'
              }`}>Enhance</span>
            </div>
            
            <div className="flex flex-col items-center">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full mb-1 ${
                localStep >= 4 
                  ? 'bg-green-500 text-white' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                <span className="text-xs font-medium">4</span>
              </div>
              <span className={`text-xs ${
                localStep >= 4 
                  ? 'text-green-400' 
                  : 'text-slate-500'
              }`}>Complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  complete: boolean;
}

function Step({ icon, label, active, complete }: StepProps) {
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center justify-center h-8 w-8 rounded-full mb-1 ${
        complete 
          ? 'bg-green-400 text-green-900' 
          : active 
            ? 'bg-blue-500 text-white' 
            : 'bg-slate-700 text-slate-400'
      }`}>
        {icon}
      </div>
      <span className={`text-xs ${
        complete 
          ? 'text-green-400' 
          : active 
            ? 'text-blue-400' 
            : 'text-slate-500'
      }`}>
        {label}
      </span>
    </div>
  );
}