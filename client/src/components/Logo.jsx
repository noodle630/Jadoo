import { cn } from "@/lib/utils";
export default function Logo({ className, size = "md", variant = "default", withText = true }) {
    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-10 w-10"
    };
    const textSizeClasses = {
        sm: "text-lg",
        md: "text-xl",
        lg: "text-2xl"
    };
    return (<div className={cn("flex items-center", className)}>
      <div className={cn("relative rounded-md flex items-center justify-center font-bold", variant === "default" ? "bg-gradient-to-br from-blue-600 to-indigo-800" : "bg-transparent", sizeClasses[size])}>
        {variant === "default" ? (<span className="text-white">{size === "sm" ? "S" : "S"}</span>) : (<span className="bg-gradient-to-br from-blue-600 to-indigo-800 bg-clip-text text-transparent">S</span>)}
        {variant === "default" && (<div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-blue-400 animate-pulse"/>)}
      </div>
      
      {withText && (<span className={cn("ml-2 font-bold tracking-tight", variant === "default"
                ? "text-slate-900 dark:text-white"
                : "bg-gradient-to-br from-blue-600 to-indigo-800 bg-clip-text text-transparent", textSizeClasses[size])}>
          S
        </span>)}
    </div>);
}
