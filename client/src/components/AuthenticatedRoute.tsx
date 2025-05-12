import { ReactNode, useEffect } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthenticatedRouteProps {
  children: ReactNode;
}

export default function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const { isAuthenticated, isLoading, refetchUser } = useAuth();
  const [location] = useLocation();

  // Attempt to refetch user data when this component mounts or location changes
  useEffect(() => {
    // Try to refresh auth status when navigating to a protected route
    refetchUser();
  }, [refetchUser, location]);

  // Use conditional rendering instead of early returns
  let content;
  
  if (isLoading) {
    content = (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  } else if (!isAuthenticated) {
    // Save the current location to redirect back after login
    localStorage.setItem('authRedirectTarget', location);
    content = <Redirect to="/login" />;
  } else {
    // Render children if authenticated
    content = <>{children}</>;
  }

  return content;
}