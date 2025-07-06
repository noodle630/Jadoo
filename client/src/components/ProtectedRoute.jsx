import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
export default function ProtectedRoute({ children }) {
    const [_, navigate] = useLocation();
    const { isAuthenticated, isLoading } = useAuth(); // ✅ use isLoading, not loading
    if (isLoading) {
        return (<div className="min-h-screen flex flex-col items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500"/>
        <p className="mt-4 text-gray-400">Verifying authentication...</p>
      </div>);
    }
    if (!isAuthenticated) {
        navigate("/login");
        return null;
    }
    return <>{children}</>;
}
