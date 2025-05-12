import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from 'react-icons/fc';

export default function Login() {
  const [_, navigate] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // If already authenticated, redirect to dashboard
  if (isAuthenticated && !isLoading) {
    navigate("/");
    return null;
  }

  const handleGoogleLogin = () => {
    // Store the current location if user is trying to access a protected route
    const intendedPath = new URLSearchParams(window.location.search).get('redirect');
    if (intendedPath) {
      localStorage.setItem('redirectAfterLogin', intendedPath);
    }
    
    // Redirect to the Google auth login endpoint
    window.location.href = "/api/auth/google";
  };

  const handleReplitLogin = () => {
    // Store the current location if user is trying to access a protected route
    const intendedPath = new URLSearchParams(window.location.search).get('redirect');
    if (intendedPath) {
      localStorage.setItem('redirectAfterLogin', intendedPath);
    }
    
    // Redirect to the Replit auth login endpoint
    window.location.href = "/api/auth/replit";
  };

  return (
    <AuthLayout>
      <Card className="bg-gray-900 border-gray-800 w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Welcome to S</CardTitle>
          <CardDescription className="text-center">
            Sign in to access your product feed transformations
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Google login button */}
          <Button
            variant="outline"
            className="w-full border-gray-700 text-white hover:bg-gray-800 flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <FcGoogle className="h-5 w-5" />
            {isLoading ? "Loading..." : "Sign in with Google"}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-500">Or continue with</span>
            </div>
          </div>
          
          {/* Replit login button */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleReplitLogin}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Sign in with Replit"}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-sm text-gray-500 text-center">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </div>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}