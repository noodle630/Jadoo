import { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

// Define the User interface based on what the API returns
interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

// Define the context shape
interface AuthContextType {
  user: User | null | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  logout: () => void;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: undefined,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Fetch the current user from the API
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
    // The backend API should return the current authenticated user or a 401 status
  });

  // Handle logout
  const logout = () => {
    // Redirect to the logout endpoint
    window.location.href = '/api/logout';
  };

  // Determine if the user is authenticated
  // User is authenticated if the user data exists and there's no error
  const isAuthenticated = !!user && !error;

  return (
    <AuthContext.Provider
      value={{
        user: user as User | null | undefined,
        isAuthenticated,
        isLoading,
        error: error as Error | null,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};