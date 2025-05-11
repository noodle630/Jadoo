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
    "Analyzing CSV structure and headers...",
    "Identifying product categories and attributes...",
    "Matching to marketplace requirements...",
    "Filling missing metadata and standardizing formats...",
    "Applying SEO optimizations to titles and descriptions...",
    "Validating against platform guidelines...",
    "Transforming to final marketplace format..."
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
  
  // Progress value for the progress ring
  const progress = (localStep / maxSteps) * 100;
  
  return (
    <div className="relative w-full max-w-lg mx-auto h-64 overflow-hidden rounded-lg bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Animated particles */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full opacity-70"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              x: `${particle.x}%`,
              y: `${particle.y}%`,
            }}
            animate={{
              x: [`${particle.x}%`, `${(particle.x + 20) % 100}%`],
              y: [`${particle.y}%`, `${(particle.y + 15) % 100}%`],
            }}
            transition={{
              duration: 15 / particle.speed,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'linear',
            }}
          />
        ))}
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6">
        {/* Progress ring */}
        <div className="relative mb-4">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle 
              cx="60" 
              cy="60" 
              r="54" 
              fill="none" 
              stroke="rgba(255,255,255,0.1)" 
              strokeWidth="6" 
            />
            {/* Progress circle */}
            <circle 
              cx="60" 
              cy="60" 
              r="54" 
              fill="none" 
              stroke="url(#gradient)" 
              strokeWidth="6" 
              strokeLinecap="round" 
              strokeDasharray="339.29"
              strokeDashoffset={339.29 - (339.29 * progress) / 100}
              transform="rotate(-90 60 60)" 
            />
            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Icon in the middle */}
          <div className="absolute inset-0 flex items-center justify-center">
            {localStep === maxSteps ? (
              <CheckCircle2 className="h-10 w-10 text-green-400" />
            ) : (
              <Sparkles className="h-10 w-10 text-blue-400 animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Status text */}
        <h3 className="text-lg font-medium text-white mb-2">
          {localStep === maxSteps ? 'Processing Complete!' : 'AI Processing in Progress...'}
        </h3>
        
        {/* Current insight */}
        <div className="h-8 flex items-center justify-center">
          <motion.p
            key={currentInsight} // Force animation to restart when text changes
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-blue-300 text-center"
          >
            {currentInsight}
          </motion.p>
        </div>
        
        {/* Processing steps */}
        <div className="flex justify-between w-full mt-6 max-w-xs">
          <Step 
            icon={<Database className="h-4 w-4" />} 
            label="Parse" 
            active={localStep >= 1} 
            complete={localStep > 1} 
          />
          <Step 
            icon={<Zap className="h-4 w-4" />} 
            label="Analyze" 
            active={localStep >= 2} 
            complete={localStep > 2} 
          />
          <Step 
            icon={<FileText className="h-4 w-4" />} 
            label="Transform" 
            active={localStep >= 3} 
            complete={localStep > 3} 
          />
          <Step 
            icon={<CheckCircle2 className="h-4 w-4" />} 
            label="Validate" 
            active={localStep >= 4} 
            complete={localStep >= maxSteps} 
          />
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