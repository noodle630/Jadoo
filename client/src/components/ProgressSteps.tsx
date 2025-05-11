interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export default function ProgressSteps({ 
  steps, 
  currentStep, 
  onStepClick 
}: ProgressStepsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((_, index) => {
          // For lines between circles
          if (index < steps.length - 1) {
            return (
              <div 
                key={`line-${index}`} 
                className={`flex-1 h-2 ${
                  currentStep > index ? "bg-primary" : "bg-gray-200"
                }`}
              />
            );
          }
          return null;
        })}
        
        {steps.map((_, index) => (
          <div 
            key={`step-${index}`}
            onClick={() => onStepClick && onStepClick(index + 1)}
            className={`relative flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium z-10 ${
              currentStep >= index + 1 
                ? "bg-primary text-white" 
                : "bg-gray-200 text-gray-600"
            } ${onStepClick ? "cursor-pointer" : ""}`}
          >
            {index + 1}
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-600">
        {steps.map((step, index) => (
          <div 
            key={`label-${index}`}
            className={`text-center ${
              currentStep >= index + 1 ? "text-primary font-medium" : ""
            }`}
          >
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
