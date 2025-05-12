import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
// Import from our new auth context
import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/AuthLayout";
import { FcGoogle } from "react-icons/fc";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Login form schema
const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const [_, setLocation] = useLocation();
  const { login, googleLogin, isAuthenticated, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Derived loading state that combines context loading with form submission
  const isLoading = loading || isSubmitting;

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
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      // Redirect will happen in the useEffect when isAuthenticated updates
    } catch (error) {
      console.error("Login error:", error);
      // Error handling is done in the auth context
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoogleLogin = () => {
    console.log("Initiating Google login from button click");
    googleLogin();
  };

  return (
    <AuthLayout>
      <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Log in</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full mb-6 bg-gray-900 border-gray-700 hover:bg-gray-800 text-white"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <FcGoogle className="mr-2 h-5 w-5" />
            Sign in with Google
          </Button>

          <Separator className="mb-6">
            <span className="px-2 text-xs text-gray-500">OR</span>
          </Separator>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="email@example.com" 
                        {...field} 
                        className="bg-gray-800 border-gray-700"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="••••••••" 
                        {...field} 
                        className="bg-gray-800 border-gray-700"
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{" "}
            <Button 
              variant="link" 
              className="p-0 text-blue-400 hover:text-blue-300"
              onClick={() => setLocation("/register")}
              disabled={isLoading}
            >
              Sign up
            </Button>
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}