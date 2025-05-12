import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

/**
 * Component that handles authentication redirects
 * Checks URL query parameters for auth status and redirects accordingly
 */
export default function AuthRedirectHandler() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, user } = useAuth();
  
  useEffect(() => {
    // Get the current URL search parameters
    const searchParams = new URLSearchParams(window.location.search);
    const authStatus = searchParams.get('auth');
    
    if (authStatus) {
      console.log('Auth status detected in URL:', authStatus);
      
      // Remove the auth parameter from URL to avoid keeping it in history
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      // Handle different authentication status
      if (authStatus === 'success') {
        console.log('Authentication successful');
        
        // Get saved redirect target from localStorage or default to dashboard
        const redirectTo = localStorage.getItem('authRedirectTarget') || '/dashboard';
        localStorage.removeItem('authRedirectTarget'); // Clean up
        
        // Wait a moment to ensure auth state is updated
        setTimeout(() => {
          if (isAuthenticated && user) {
            toast({
              title: 'Login successful!',
              description: `Welcome${user.firstName ? ', ' + user.firstName : ''}!`,
            });
            setLocation(redirectTo);
          } else {
            setLocation('/dashboard');
          }
        }, 500);
      } else if (authStatus === 'session_error') {
        toast({
          title: 'Session Error',
          description: 'There was a problem with your session. Please try logging in again.',
          variant: 'destructive',
        });
      } else if (authStatus === 'no_session') {
        toast({
          title: 'Login Error',
          description: 'Session could not be created. Please try again.',
          variant: 'destructive',
        });
      }
    }
  }, [location, isAuthenticated, user, setLocation]);
  
  return null; // This is a utility component with no UI
}