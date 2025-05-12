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
import { useAuth } from "@/hooks/useAuth";

import AuthenticatedRoute from "@/components/AuthenticatedRoute";
import AuthRedirectHandler from "@/components/AuthRedirectHandler";

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => (
          <AuthenticatedRoute>
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
                <Route path="/settings" component={Settings} />
                <Route path="/channels" component={Channels} />
                <Route path="/connections" component={Channels} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </AuthenticatedRoute>
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
          <Toaster />
          <AuthRedirectHandler />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
