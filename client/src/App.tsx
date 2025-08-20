import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminDashboard } from "@/pages/admin-dashboard";
import { UserVoting } from "@/pages/user-voting";
import { AdminLogin } from "@/pages/admin-login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AdminLogin} />
      <Route path="/login" component={AdminLogin} />
      <Route path="/dashboard/:adminId" component={AdminDashboard} />
      <Route path="/vote/:uniqueCode" component={UserVoting} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
