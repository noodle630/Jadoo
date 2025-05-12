import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import type { User } from '@shared/schema';

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: () => void;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for components to access the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Provider component that wraps the app and makes auth object available
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();
  
  // Derived value for authentication status - true if user is non-null
  const isAuthenticated = !!user;

  // Function to fetch the current user
  const fetchUser = async (): Promise<User | null> => {
    try {
      console.log('Fetching current user...');
      const response = await fetch('/api/auth/user');
      
      // If not authenticated, clear user and return null
      if (response.status === 401) {
        console.log('Not authenticated');
        setUser(null);
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log('User data fetched:', userData);
      return userData;
    } catch (err) {
      console.error('Error fetching user:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    }
  };

  // Function to refetch user data
  const refetchUser = async (): Promise<void> => {
    setLoading(true);
    try {
      const userData = await fetchUser();
      setUser(userData);
    } catch (err) {
      console.error('Error refetching user:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  // Login function - uses email and password
  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      // Refetch user data after successful login
      await refetchUser();
      
      toast({
        title: 'Login successful!',
        description: 'Welcome back!',
      });
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      toast({
        title: 'Login failed',
        description: err instanceof Error ? err.message : 'Invalid email or password',
        variant: 'destructive',
      });
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Google login function - redirects to Google auth
  const googleLogin = (): void => {
    console.log('Initiating Google login');
    // Save current location to redirect back after login
    localStorage.setItem('authRedirectTarget', window.location.pathname);
    // Redirect to Google auth endpoint
    window.location.href = '/api/auth/google';
  };

  // Logout function
  const logout = async (): Promise<void> => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout');
      setUser(null);
      
      // Clear all queries and cache
      queryClient.clear();
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      
      // Redirect to login page
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      
      toast({
        title: 'Logout failed',
        description: 'There was an error logging out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Check for auth parameter in URL (for redirects from OAuth)
  useEffect(() => {
    const handleAuthRedirect = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const authStatus = searchParams.get('auth');
      
      if (authStatus) {
        console.log('Auth status detected in URL:', authStatus);
        
        // Remove the auth parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        if (authStatus === 'success') {
          console.log('Authentication successful, fetching user data');
          await refetchUser();
          
          const redirectTo = localStorage.getItem('authRedirectTarget') || '/';
          localStorage.removeItem('authRedirectTarget'); // Clean up
          
          if (user) {
            toast({
              title: 'Login successful!',
              description: `Welcome${user.firstName ? ', ' + user.firstName : ''}!`,
            });
            window.location.href = redirectTo;
          } else {
            console.log('Auth success but user not loaded, reloading page');
            window.location.href = redirectTo;
          }
        } else if (authStatus === 'session_error' || authStatus === 'no_session') {
          toast({
            title: 'Authentication Error',
            description: 'There was a problem with your authentication. Please try again.',
            variant: 'destructive',
          });
          window.location.href = '/login';
        }
      }
    };
    
    handleAuthRedirect();
  }, []);

  // Initial loading of user on mount
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      try {
        const userData = await fetchUser();
        setUser(userData);
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Create the auth value object
  const value = {
    user,
    loading,
    error,
    login,
    googleLogin,
    logout,
    refetchUser,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}