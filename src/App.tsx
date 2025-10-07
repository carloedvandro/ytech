import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { EnvironmentProvider } from "@/contexts/EnvironmentContext";
import { ImpersonationProvider } from "@/contexts/ImpersonationContext";
import { AuthGuard } from "@/components/AuthGuard";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import Network from "./pages/Network";
import Financial from "./pages/Financial";
import Admin from "./pages/Admin";
import Users from "./pages/Users";
import AdminActivations from "./pages/AdminActivations";
import MigrateUsers from "./pages/MigrateUsers";
import ChangePassword from "./pages/ChangePassword";
import MiniSite from "./pages/MiniSite";
import SimActivation from "./pages/SimActivation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <EnvironmentProvider>
          <AuthProvider>
            <ImpersonationProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/cadastro" element={<Signup />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
                <Route path="/checkout" element={<AuthGuard><Checkout /></AuthGuard>} />
                <Route path="/payment/:paymentId" element={<AuthGuard><Payment /></AuthGuard>} />
                <Route path="/network" element={<AuthGuard><Network /></AuthGuard>} />
                <Route path="/financial" element={<AuthGuard><Financial /></AuthGuard>} />
                <Route path="/admin" element={<AuthGuard><Admin /></AuthGuard>} />
                <Route path="/users" element={<AuthGuard><Users /></AuthGuard>} />
                <Route path="/admin/activations" element={<AuthGuard><AdminActivations /></AuthGuard>} />
                <Route path="/change-password" element={<AuthGuard><ChangePassword /></AuthGuard>} />
                <Route path="/sim-activation" element={<AuthGuard><SimActivation /></AuthGuard>} />
                <Route path="/migrate-users" element={<MigrateUsers />} />
                <Route path="/site/:username" element={<MiniSite />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ImpersonationProvider>
          </AuthProvider>
        </EnvironmentProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
