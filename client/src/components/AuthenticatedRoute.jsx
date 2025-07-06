var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { useEffect, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
export default function AuthenticatedRoute({ children }) {
    const { user, isLoading, refetchUser } = useAuth();
    const [location] = useLocation();
    const [localLoading, setLocalLoading] = useState(true);
    // Derived state for authentication
    const isAuthenticated = !!user;
    // Attempt to refetch user data when this component mounts or location changes
    useEffect(() => {
        // Try to refresh auth status when navigating to a protected route
        let isMounted = true;
        const checkAuth = () => __awaiter(this, void 0, void 0, function* () {
            try {
                console.log("AuthenticatedRoute: Checking authentication status");
                yield refetchUser();
                if (isMounted) {
                    console.log("AuthenticatedRoute: Authentication checked, user:", user ? "found" : "not found");
                    // Wait until we've definitely tried to fetch the user before deciding
                    setLocalLoading(false);
                }
            }
            catch (err) {
                console.error("AuthenticatedRoute: Error checking auth:", err);
                if (isMounted) {
                    setLocalLoading(false);
                }
            }
        });
        checkAuth();
        return () => {
            isMounted = false;
        };
    }, [refetchUser, user, location]);
    // Always render the same way regardless of conditions to avoid React hooks issues
    // Create the final component before returning
    let content;
    // While both the auth query is loading OR our local loading state is true, show the loader
    if (isLoading || localLoading) {
        content = (<div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500"/>
        <span className="ml-2 text-sm text-muted-foreground">Checking authentication...</span>
      </div>);
    }
    else if (!isAuthenticated) {
        console.log("AuthenticatedRoute: Not authenticated, redirecting to login");
        // Save the current location to redirect back after login
        localStorage.setItem('authRedirectTarget', location);
        content = <Redirect to="/login"/>;
    }
    else {
        // If we get here, user is authenticated
        console.log("AuthenticatedRoute: Authenticated, rendering children");
        content = <>{children}</>;
    }
    return content;
}
