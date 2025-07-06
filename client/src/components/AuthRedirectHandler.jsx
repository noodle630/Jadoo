import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
/**
 * Component that handles authentication redirects
 * Checks URL query parameters for auth status and redirects accordingly
 */
export default function AuthRedirectHandler() {
    const [location, setLocation] = useLocation();
    const { isAuthenticated, user } = useAuth();
    const queryClient = useQueryClient();
    useEffect(() => {
        // Get the current URL search parameters
        const searchParams = new URLSearchParams(window.location.search);
        const authStatus = searchParams.get('auth');
        // Use local variable instead of early return
        let shouldContinue = true;
        // If user is authenticated but on the login page, redirect to dashboard
        if (isAuthenticated && (location === '/login' || location === '/register')) {
            console.log('User is authenticated but on login/register page, redirecting to dashboard');
            setLocation('/');
            shouldContinue = false;
        }
        // Only continue if we haven't already redirected
        if (shouldContinue && authStatus) {
            console.log('Auth status detected in URL:', authStatus);
            // Remove the auth parameter from URL to avoid keeping it in history
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            // Handle different authentication status
            if (authStatus === 'success') {
                console.log('Authentication successful');
                // Force refresh user data
                queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                // Get saved redirect target from localStorage or default to dashboard
                const redirectTo = localStorage.getItem('authRedirectTarget') || '/';
                localStorage.removeItem('authRedirectTarget'); // Clean up
                // More aggressive approach to ensure authentication state is refreshed
                console.log('Forcing multiple invalidations to refresh auth state...');
                // First invalidation
                queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                // Set a short timeout to allow the invalidation to trigger a fetch
                setTimeout(() => {
                    // Second invalidation
                    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                    queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
                    // Wait a moment to ensure auth state is updated
                    setTimeout(() => {
                        // Check if user is authenticated
                        if (isAuthenticated && user) {
                            toast({
                                title: 'Login successful!',
                                description: `Welcome${user.firstName ? ', ' + user.firstName : ''}!`,
                            });
                            console.log('User authenticated, redirecting to:', redirectTo);
                            setLocation(redirectTo);
                        }
                        else {
                            console.log('Auth success, but user not loaded yet. Forcing full page reload...');
                            // Use stronger approach - reload the entire page with the redirect target
                            // This ensures a fresh state with the new session cookies
                            window.location.href = redirectTo;
                        }
                    }, 800); // Longer wait to ensure auth query completes
                }, 200);
            }
            else if (authStatus === 'session_error') {
                toast({
                    title: 'Session Error',
                    description: 'There was a problem with your session. Please try logging in again.',
                    variant: 'destructive',
                });
                setLocation('/login');
            }
            else if (authStatus === 'no_session') {
                toast({
                    title: 'Login Error',
                    description: 'Session could not be created. Please try again.',
                    variant: 'destructive',
                });
                setLocation('/login');
            }
        }
    }, [location, isAuthenticated, user, setLocation, queryClient]);
    return null; // This is a utility component with no UI
}
