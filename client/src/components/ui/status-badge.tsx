import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Info,
} from "lucide-react";

// Status types supported by the component
export type StatusType = 
  | "success" 
  | "warning" 
  | "error" 
  | "processing" 
  | "pending" 
  | "info" 
  | "neutral";

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
  icon?: ReactNode;
}

// Default labels for status types
const statusLabels: Record<StatusType, string> = {
  success: "Success",
  warning: "Warning",
  error: "Error",
  processing: "Processing",
  pending: "Pending",
  info: "Info",
  neutral: "",
};

// Default icons for status types
const statusIcons: Record<StatusType, ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5" />,
  warning: <AlertTriangle className="h-3.5 w-3.5" />,
  error: <XCircle className="h-3.5 w-3.5" />,
  processing: <Clock className="h-3.5 w-3.5 animate-spin" />,
  pending: <Clock className="h-3.5 w-3.5" />,
  info: <Info className="h-3.5 w-3.5" />,
  neutral: null,
};

// CSS classes for different status types
const statusClasses: Record<StatusType, string> = {
  success: "bg-green-900/20 text-green-400 border-green-800",
  warning: "bg-yellow-900/20 text-yellow-400 border-yellow-800",
  error: "bg-red-900/20 text-red-400 border-red-800",
  processing: "bg-blue-900/20 text-blue-400 border-blue-800 animate-pulse",
  pending: "bg-yellow-900/20 text-yellow-400 border-yellow-800",
  info: "bg-blue-900/20 text-blue-400 border-blue-800",
  neutral: "bg-slate-800 text-slate-400 border-slate-700",
};

// Size classes
const sizeClasses = {
  sm: "text-xs py-0.5 px-1.5",
  md: "text-xs py-1 px-2",
  lg: "text-sm py-1 px-2.5",
};

export function StatusBadge({
  status,
  label,
  size = "md",
  showIcon = true,
  className,
  icon,
}: StatusBadgeProps) {
  // Use custom label if provided, otherwise use default
  const displayLabel = label || statusLabels[status];
  
  // Use custom icon if provided, otherwise use default
  const displayIcon = icon !== undefined ? icon : statusIcons[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        statusClasses[status],
        sizeClasses[size],
        className
      )}
    >
      {showIcon && displayIcon && (
        <span className="mr-1 flex items-center">{displayIcon}</span>
      )}
      {displayLabel}
    </Badge>
  );
}

export default StatusBadge;