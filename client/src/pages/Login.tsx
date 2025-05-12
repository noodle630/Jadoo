import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
// Import from our new auth context
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import { FcGoogle } from "react-icons/fc";
import { SiGithub } from "react-icons/si";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";

// Login form schema
const formSchema = z.object({});

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const { login, isAuthenticated, isLoading } = useAuth();
  
  // Check for redirect after mount
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is authenticated, redirecting to dashboard");
      const redirectTo = localStorage.getItem('authRedirectTarget') || '/';
      localStorage.removeItem('authRedirectTarget');
      setLocation(redirectTo);
    }
  }, [isAuthenticated, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const handleLogin = () => {
    // This will redirect to the Replit auth page
    login();
  };

  return (
    <AuthLayout>
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Log in</CardTitle>
          <CardDescription>
            Sign in to access Project S
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
          <div className="w-full max-w-xs">
            <Button 
              variant="outline" 
              className="w-full bg-gray-900 border-gray-700 hover:bg-gray-800 text-white"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent"></div>
                  <span>Please wait...</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <SiGithub className="mr-2 h-5 w-5" />
                  <span>Continue with Replit</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-400 text-center">
            By signing in, you agree to our terms and privacy policy.
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}