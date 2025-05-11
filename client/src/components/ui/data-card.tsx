import { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { truncate } from "@/lib/design-system";

interface DataCardProps {
  title: string;
  subtitle?: string | ReactNode;
  badge?: {
    label: string;
    variant?: BadgeProps["variant"];
    icon?: ReactNode;
  };
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
  children?: ReactNode;
  titleLines?: number;
  subtitleLines?: number;
  icon?: ReactNode;
  iconBackground?: string;
  isHoverable?: boolean;
  isClickable?: boolean;
}

export function DataCard({
  title,
  subtitle,
  badge,
  footer,
  className,
  onClick,
  children,
  titleLines = 1,
  subtitleLines = 1,
  icon,
  iconBackground,
  isHoverable = true,
  isClickable = true,
}: DataCardProps) {
  return (
    <Card
      className={cn(
        "border border-slate-800 bg-slate-900/70 overflow-hidden transition-all duration-200 h-full flex flex-col",
        isHoverable && "hover:bg-slate-800/80 hover:border-slate-700/80",
        isClickable && onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-3 space-y-1.5">
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {icon && (
              <div
                className={cn(
                  "flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
                  iconBackground || "bg-slate-800"
                )}
              >
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle 
                className={cn(
                  "text-lg font-semibold text-white",
                  truncate.line(titleLines)
                )}
              >
                {title}
              </CardTitle>
              
              {subtitle && (
                <div 
                  className={cn(
                    "text-sm text-slate-400 mt-0.5",
                    typeof subtitle === "string" && truncate.line(subtitleLines)
                  )}
                >
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          
          {badge && (
            <Badge 
              variant={badge.variant || "outline"} 
              className="flex-shrink-0 flex items-center gap-1"
            >
              {badge.icon}
              {badge.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      {children && (
        <CardContent className="px-4 py-3 flex-1">
          {children}
        </CardContent>
      )}
      
      {footer && (
        <CardFooter className="px-4 py-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}

export default DataCard;