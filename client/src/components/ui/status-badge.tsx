import React from "react";
import { CheckCircle, AlertCircle, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatusType = 
  | "success" 
  | "error" 
  | "processing" 
  | "pending" 
  | "warning"
  | "completed"
  | "failed"
  | "warnings";

interface StatusBadgeProps {
  status: StatusType;
  size?: "xs" | "sm" | "md" | "lg";
  withIcon?: boolean;
  className?: string;
}

export function StatusBadge({ 
  status, 
  size = "md", 
  withIcon = true,
  className 
}: StatusBadgeProps) {
  // Normalize the status
  const normalizedStatus = normalizeStatus(status);
  
  // Map sizes to classes
  const sizeClasses = {
    xs: "text-xs px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  };
  
  // Get the color and text based on status
  const { bg, text, icon: Icon, label } = getStatusStyles(normalizedStatus);
  
  return (
    <div 
      className={cn(
        "inline-flex items-center font-medium rounded-full",
        bg,
        text,
        sizeClasses[size],
        className
      )}
    >
      {withIcon && <Icon className="mr-1" size={size === "xs" ? 12 : size === "sm" ? 14 : size === "md" ? 16 : 18} />}
      <span>{label}</span>
    </div>
  );
}

// Helper to normalize status values
function normalizeStatus(status: StatusType): "success" | "error" | "processing" | "pending" | "warning" {
  const statusMap: Record<StatusType, "success" | "error" | "processing" | "pending" | "warning"> = {
    "success": "success",
    "completed": "success",
    "error": "error", 
    "failed": "error",
    "warning": "warning",
    "warnings": "warning",
    "processing": "processing",
    "pending": "pending"
  };
  
  return statusMap[status] || "pending";
}

// Helper to get the status styles
function getStatusStyles(status: ReturnType<typeof normalizeStatus>) {
  switch (status) {
    case "success":
      return {
        bg: "bg-green-500/10",
        text: "text-green-500",
        icon: CheckCircle,
        label: "Success"
      };
    case "error":
      return {
        bg: "bg-red-500/10",
        text: "text-red-500",
        icon: AlertCircle,
        label: "Error"
      };
    case "processing":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-500",
        icon: Clock,
        label: "Processing"
      };
    case "pending":
      return {
        bg: "bg-yellow-500/10",
        text: "text-yellow-500",
        icon: Clock,
        label: "Pending"
      };
    case "warning":
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-500",
        icon: AlertTriangle,
        label: "Warning"
      };
  }
}