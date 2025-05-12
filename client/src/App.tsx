import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";

import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import NewFeedV2 from "@/pages/NewFeedV2";
import Templates from "@/pages/Templates";
import History from "@/pages/History";
import FeedHistory from "@/pages/FeedHistory";
import Settings from "@/pages/Settings";
import Products from "@/pages/Products";
import ProductCategories from "@/pages/ProductCategories";
import ProductsImport from "@/pages/ProductsImport";
import Channels from "@/pages/Channels";
import NotFound from "@/pages/not-found";
import FeedHistoryDebug from "@/pages/FeedHistoryDebug";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Transform from "@/pages/Transform";
import SimpleTransform from "@/pages/SimpleTransform";

// Import our AuthContext and AuthProvider
import { AuthProvider } from "@/contexts/AuthContext";

// Import our ProtectedRoute component
import ProtectedRoute from "@/components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => (
          <ProtectedRoute>
            <Layout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/feed/new" component={NewFeedV2} />
                <Route path="/create-feed" component={NewFeedV2} />
                <Route path="/feeds/:id" component={Products} />
                <Route path="/feeds-debug" component={FeedHistoryDebug} />
                <Route path="/products" component={Products} />
                <Route path="/products/categories" component={ProductCategories} />
                <Route path="/products/import" component={ProductsImport} />
                <Route path="/templates" component={Templates} />
                <Route path="/history" component={FeedHistory} />
                <Route path="/feeds" component={FeedHistory} />
                <Route path="/transform" component={Transform} />
                <Route path="/simple-transform" component={SimpleTransform} />
                <Route path="/settings" component={Settings} />
                <Route path="/channels" component={Channels} />
                <Route path="/connections" component={Channels} />
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
