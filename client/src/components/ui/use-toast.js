// File: client/src/components/ui/use-toast.ts
export function useToast() {
    return {
        toast: ({ title, description, variant = "default" }) => {
            console.log(`[${variant.toUpperCase()}] ${title}: ${description || ""}`);
        },
    };
}
