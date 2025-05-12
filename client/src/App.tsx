import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";

// Import our pages
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";

// Import for new pages
import CreateFeed from "@/pages/CreateFeed";
import Templates from "@/pages/Templates";
import History from "@/pages/History";
import Settings from "@/pages/Settings";

// Import our AuthContext and AuthProvider
import { AuthProvider } from "@/contexts/AuthContext";

// Import our ProtectedRoute component
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <Layout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/new-feed" component={CreateFeed} />
                <Route path="/templates" component={Templates} />
                <Route path="/history" component={History} />
                <Route path="/settings" component={Settings} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </ProtectedRoute>
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="s-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
