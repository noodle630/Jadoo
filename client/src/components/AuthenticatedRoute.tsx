import { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface AuthenticatedRouteProps {
  children: ReactNode;
}

export default function AuthenticatedRoute({ children }: AuthenticatedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  // Show a loading spinner while checking authentication status
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  // Render children if authenticated
  return <>{children}</>;
}