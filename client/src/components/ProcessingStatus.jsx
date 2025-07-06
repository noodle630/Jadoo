import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, CheckCheck, Clock } from "lucide-react";
export default function ProcessingStatus({ isComplete, progress, onCancel, onContinue, estimatedTimeRemaining = "~2 min", currentTask = "Optimizing product titles and descriptions", tasks = [
    { name: "Data validation", status: "completed" },
    { name: "Category mapping", status: "completed" },
    { name: "Optimizing product titles", status: "in-progress" },
    { name: "Format validation", status: "pending" }
], summary = {
    dataCleaning: 42,
    titleOptimization: 18,
    categoryMapping: 5,
    pricingAnalysis: 2
} }) {
    // If this is a real component, you might want to add actual timing logic
    // instead of this simple increment
    const [localProgress, setLocalProgress] = useState(progress);
    useEffect(() => {
        if (!isComplete && localProgress < 100) {
            const timer = setTimeout(() => {
                setLocalProgress((prev) => Math.min(prev + 1, 99));
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [localProgress, isComplete]);
    return (<div className="text-center py-6 mb-6">
      {!isComplete ? (<div>
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
          <h4 className="text-lg font-medium text-gray-800 mb-2">Processing Your Data</h4>
          <p className="text-gray-500">Our AI is cleaning and transforming your data for the marketplace.</p>
          
          <div className="mt-6 max-w-md mx-auto">
            <div className="relative pt-1">
              <div className="flex mb-2 items-center justify-between">
                <div>
                  <span className="text-xs font-semibold inline-block text-primary">
                    {localProgress}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold inline-block text-primary">
                    Time remaining: {estimatedTimeRemaining}
                  </span>
                </div>
              </div>
              <Progress value={localProgress} className="h-2 mb-4"/>
            </div>
            
            <div className="text-left mt-4">
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Current task:</span> {currentTask}
              </div>
              <ul className="space-y-2 text-sm">
                {tasks.map((task, idx) => (<li key={idx} className={`flex items-center ${task.status === 'completed'
                    ? 'text-green-600'
                    : task.status === 'in-progress'
                        ? 'text-primary'
                        : 'text-gray-400'}`}>
                    {task.status === 'completed' && <CheckCheck className="w-4 h-4 mr-2"/>}
                    {task.status === 'in-progress' && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                    {task.status === 'pending' && <Clock className="w-4 h-4 mr-2"/>}
                    <span>{task.name}</span>
                  </li>))}
              </ul>
            </div>
          </div>
          
          <Button variant="outline" className="mt-6 border-destructive text-destructive hover:bg-destructive/10" onClick={onCancel}>
            Cancel Processing
          </Button>
        </div>) : (<div>
          <div className="inline-block rounded-full h-16 w-16 bg-green-100 text-green-500 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8"/>
          </div>
          <h4 className="text-lg font-medium text-gray-800 mb-2">Processing Complete!</h4>
          <p className="text-gray-500 mb-6">Your data has been successfully transformed.</p>
          
          {/* AI Transformation Summary */}
          <div className="max-w-2xl mx-auto bg-white border rounded-lg p-6 text-left mb-6">
            <h5 className="font-medium text-gray-800 mb-3">AI Transformation Summary</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 bg-green-50 border-green-100">
                <div className="flex items-center text-green-700 mb-1">
                  <CheckCircle2 className="w-4 h-4 mr-2"/>
                  <span className="font-medium">Data Cleaning</span>
                </div>
                <p className="text-sm text-green-700">{summary.dataCleaning} fields cleaned and standardized</p>
              </div>
              <div className="border rounded-lg p-3 bg-blue-50 border-blue-100">
                <div className="flex items-center text-blue-700 mb-1">
                  <CheckCircle2 className="w-4 h-4 mr-2"/>
                  <span className="font-medium">Title Optimization</span>
                </div>
                <p className="text-sm text-blue-700">{summary.titleOptimization} titles enhanced for better SEO</p>
              </div>
              <div className="border rounded-lg p-3 bg-purple-50 border-purple-100">
                <div className="flex items-center text-purple-700 mb-1">
                  <CheckCircle2 className="w-4 h-4 mr-2"/>
                  <span className="font-medium">Category Mapping</span>
                </div>
                <p className="text-sm text-purple-700">{summary.categoryMapping} categories corrected and standardized</p>
              </div>
              <div className="border rounded-lg p-3 bg-orange-50 border-orange-100">
                <div className="flex items-center text-orange-700 mb-1">
                  <CheckCircle2 className="w-4 h-4 mr-2"/>
                  <span className="font-medium">Pricing Analysis</span>
                </div>
                <p className="text-sm text-orange-700">{summary.pricingAnalysis} pricing errors detected and fixed</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Button variant="outline" onClick={onCancel}>
              Back to Configure
            </Button>
            <Button onClick={onContinue}>
              Continue to Feed Generation
            </Button>
          </div>
        </div>)}
    </div>);
}
