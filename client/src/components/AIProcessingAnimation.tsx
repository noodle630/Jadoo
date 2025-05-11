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
  
  // Progress value for the progress ring
  const progress = (localStep / maxSteps) * 100;
  
  return (
    <div className="relative w-full max-w-lg mx-auto h-72 overflow-hidden rounded-xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800">
      {/* Animated glow */}
      <div className="absolute inset-0 overflow-hidden z-0">
        <motion.div 
          className="absolute h-32 w-32 rounded-full bg-blue-600/20 filter blur-3xl"
          animate={{
            x: ['-25%', '125%'],
            y: ['60%', '30%', '60%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
        <motion.div 
          className="absolute h-32 w-32 rounded-full bg-purple-600/20 filter blur-3xl"
          animate={{
            x: ['125%', '-25%'],
            y: ['40%', '70%', '40%'],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
        />
      </div>
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden z-0">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              backgroundColor: particle.color,
              opacity: 0.4,
              x: `${particle.x}%`,
              y: `${particle.y}%`,
            }}
            animate={{
              x: [`${particle.x}%`, `${(particle.x + 30) % 100}%`],
              y: [`${particle.y}%`, `${(particle.y + 25) % 100}%`],
              opacity: [0.4, 0.7, 0.4],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 12 / particle.speed,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-6">
        {/* Animated brain or neural network visualization */}
        <div className="relative mb-2">
          <motion.div
            className="relative w-28 h-28 flex items-center justify-center"
          >
            <svg width="112" height="112" viewBox="0 0 100 100" className="absolute">
              <motion.path
                d="M20,50 C20,30 35,15 50,15 C65,15 80,30 80,50 C80,70 65,85 50,85 C35,85 20,70 20,50 Z"
                fill="none"
                stroke="rgba(59, 130, 246, 0.5)"
                strokeWidth="1"
                animate={{
                  rotate: [0, 360],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </svg>
            
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{
                rotate: [0, -360],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              <svg width="100" height="100" viewBox="0 0 100 100">
                <motion.circle
                  cx="50"
                  cy="20"
                  r="3"
                  fill="#3B82F6"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.circle
                  cx="80"
                  cy="50"
                  r="3"
                  fill="#8B5CF6"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                />
                <motion.circle
                  cx="50"
                  cy="80"
                  r="3"
                  fill="#3B82F6"
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.circle
                  cx="20"
                  cy="50"
                  r="3"
                  fill="#8B5CF6"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                />
                
                <motion.line
                  x1="50"
                  y1="20"
                  x2="80"
                  y2="50"
                  stroke="url(#lineGradient1)"
                  strokeWidth="1"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.line
                  x1="80"
                  y1="50"
                  x2="50"
                  y2="80"
                  stroke="url(#lineGradient2)"
                  strokeWidth="1"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <motion.line
                  x1="50"
                  y1="80"
                  x2="20"
                  y2="50"
                  stroke="url(#lineGradient1)"
                  strokeWidth="1"
                  animate={{ opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                />
                <motion.line
                  x1="20"
                  y1="50"
                  x2="50"
                  y2="20"
                  stroke="url(#lineGradient2)"
                  strokeWidth="1"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2.8, repeat: Infinity }}
                />
                
                <defs>
                  <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                  <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#3B82F6" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
            
            {/* Central element */}
            <motion.div 
              className={`absolute inset-0 flex items-center justify-center ${
                localStep === maxSteps ? 'text-green-400' : 'text-blue-400'
              }`}
              animate={{
                scale: localStep === maxSteps ? [1, 1] : [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {localStep === maxSteps ? (
                <CheckCircle2 className="h-12 w-12" />
              ) : (
                <Sparkles className="h-12 w-12" />
              )}
            </motion.div>
          </motion.div>
        </div>
        
        {/* Status text */}
        <h3 className="text-xl font-medium text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {localStep === maxSteps ? 'S is Ready!' : 'AI Magic in Progress'}
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