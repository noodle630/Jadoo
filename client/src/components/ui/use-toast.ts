// File: client/src/components/ui/use-toast.ts

type ToastVariant = "default" | "destructive";

interface ToastProps {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

export function useToast() {
  return {
    toast: ({ title, description, variant = "default" }: ToastProps) => {
      console.log(`[${variant.toUpperCase()}] ${title}: ${description || ""}`);
    },
  };
}
