import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
export function DataCard({ className, onClick, children, isClickable = false }) {
    return (<Card className={cn("bg-slate-900 border-slate-800 overflow-hidden", isClickable && "transition-colors hover:bg-slate-800 cursor-pointer", className)} onClick={isClickable ? onClick : undefined}>
      {children}
    </Card>);
}
export function DataCardHeader({ className, children }) {
    return (<CardHeader className={cn("p-4 pb-2", className)}>
      {children}
    </CardHeader>);
}
export function DataCardContent({ className, children }) {
    return (<CardContent className={cn("p-4 pt-0", className)}>
      {children}
    </CardContent>);
}
export function DataCardFooter({ className, children }) {
    return (<CardFooter className={cn("p-4 pt-0 flex items-center justify-between", className)}>
      {children}
    </CardFooter>);
}
export function DataCardTitle({ children, className }) {
    return (<h3 className={cn("font-medium text-white", className)}>
      {children}
    </h3>);
}
export function DataCardDescription({ children, className }) {
    return (<p className={cn("text-sm text-slate-400", className)}>
      {children}
    </p>);
}
export function DataCardStat({ label, value, className }) {
    return (<div className={cn("", className)}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>);
}
