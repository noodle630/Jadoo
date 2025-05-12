import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export function useAuth() {
  const queryClient = useQueryClient();
  
  // Query for the currently logged in user
  const { 
    data: user, 
    isLoading, 
    error 
  } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Mutation for registering a new user
  const register = useMutation({
    mutationFn: async (userData: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      confirmPassword: string;
      companyName?: string;
    }) => {
      return apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    },
    onSuccess: () => {
      toast({
        title: "Registration successful!",
        description: "Your account has been created. Please log in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "There was an error registering your account. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Mutation for logging in
  const login = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    },
    onSuccess: () => {
      // Refetch the user after successful login
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login successful!",
        description: "Welcome back!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive"
      });
    }
  });

  // Mutation for logging out
  const logout = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/auth/logout', {
        method: 'GET'
      });
    },
    onSuccess: () => {
      // Clear the user cache after logout
      queryClient.resetQueries({ queryKey: ["/api/auth/user"] });
      queryClient.setQueryData(["/api/auth/user"], null);
      window.location.href = "/login"; // Redirect to login page
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Helper function to initiate Google login
  const googleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    register,
    login,
    logout,
    googleLogin
  };
}