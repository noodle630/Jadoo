// File: client/src/App.tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
// Pages
import NewFeedV2 from "@/pages/NewFeedV2";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
// Shell layout
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
function Router() {
    return (<Switch>
      <Route path="/login" component={Login}/>

      {/* Authenticated Shell */}
      <Route path="/">
        {() => (<ProtectedRoute>
            <NewFeedV2 />
          </ProtectedRoute>)}
      </Route>

      <Route component={NotFound}/>
    </Switch>);
}
function App() {
    return (<ThemeProvider defaultTheme="dark" storageKey="s-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>);
}
export default App;
