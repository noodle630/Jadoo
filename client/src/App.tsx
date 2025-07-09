// File: client/src/App.tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { ErrorBoundary } from "react-error-boundary";

// Pages
import NewFeedV2 from "@/pages/NewFeedV2";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import WalletSuccess from "@/pages/WalletSuccess";
import WalletCancel from "@/pages/WalletCancel";
import WalletTest from "@/pages/WalletTest";

// Shell layout
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
      <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
      <pre className="bg-gray-800 p-4 rounded text-red-400 max-w-lg overflow-x-auto">{error.message}</pre>
      <button className="mt-6 px-4 py-2 bg-blue-600 rounded" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}

function Router() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/wallet/success" component={WalletSuccess} />
        <Route path="/wallet/cancel" component={WalletCancel} />
        <Route path="/wallet/test" component={WalletTest} />

        {/* Authenticated Shell */}
        <Route path="/">
          {() => (
            <ProtectedRoute>
              <NewFeedV2 />
            </ProtectedRoute>
          )}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
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
