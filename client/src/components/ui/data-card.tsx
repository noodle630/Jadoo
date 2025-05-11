import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DataCardProps {
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
  isClickable?: boolean;
}

export function DataCard({ 
  className, 
  onClick, 
  children, 
  isClickable = false 
}: DataCardProps) {
  return (
    <Card 
      className={cn(
        "bg-slate-900 border-slate-800 overflow-hidden", 
        isClickable && "transition-colors hover:bg-slate-800 cursor-pointer",
        className
      )}
      onClick={isClickable ? onClick : undefined}
    >
      {children}
    </Card>
  );
}

interface DataCardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export function DataCardHeader({ 
  className, 
  children 
}: DataCardHeaderProps) {
  return (
    <CardHeader className={cn("p-4 pb-2", className)}>
      {children}
    </CardHeader>
  );
}

interface DataCardContentProps {
  className?: string;
  children: React.ReactNode;
}

export function DataCardContent({ 
  className, 
  children 
}: DataCardContentProps) {
  return (
    <CardContent className={cn("p-4 pt-0", className)}>
      {children}
    </CardContent>
  );
}

interface DataCardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export function DataCardFooter({ 
  className, 
  children 
}: DataCardFooterProps) {
  return (
    <CardFooter className={cn("p-4 pt-0 flex items-center justify-between", className)}>
      {children}
    </CardFooter>
  );
}

interface DataCardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function DataCardTitle({ 
  children,
  className
}: DataCardTitleProps) {
  return (
    <h3 className={cn("font-medium text-white", className)}>
      {children}
    </h3>
  );
}

interface DataCardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function DataCardDescription({ 
  children,
  className
}: DataCardDescriptionProps) {
  return (
    <p className={cn("text-sm text-slate-400", className)}>
      {children}
    </p>
  );
}

interface DataCardStatProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function DataCardStat({ 
  label,
  value,
  className
}: DataCardStatProps) {
  return (
    <div className={cn("", className)}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  );
}