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
import Resellers from "./pages/Resellers";
import MiniSite from "./pages/MiniSite";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Checkout from "./pages/Checkout";
import Payment from "./pages/Payment";
import Network from "./pages/Network";
import Financial from "./pages/Financial";
import Admin from "./pages/Admin";
import Users from "./pages/Users";
import ChangePassword from "./pages/ChangePassword";
import MigrateUsers from "./pages/MigrateUsers";
import SimActivation from "./pages/SimActivation";
import AdminActivations from "./pages/AdminActivations";
import FixCommissions from "./pages/FixCommissions";
import WebhookTest from "./pages/WebhookTest";
import AuditLogs from "./pages/AuditLogs";
import NotFound from "./pages/NotFound";
import TermosDeUso from "./pages/TermosDeUso";
import Privacidade from "./pages/Privacidade";
import RegulamentoMMN from "./pages/RegulamentoMMN";
import APN from "./pages/APN";

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
              <Route path="/apn" element={<APN />} />
              <Route path="/revendedores" element={<Resellers />} />
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
                <Route path="/fix-commissions" element={<AuthGuard><FixCommissions /></AuthGuard>} />
                <Route path="/webhook-test" element={<AuthGuard><WebhookTest /></AuthGuard>} />
                <Route path="/audit-logs" element={<AuthGuard><AuditLogs /></AuthGuard>} />
                <Route path="/migrate-users" element={<MigrateUsers />} />
                <Route path="/site/:username" element={<MiniSite />} />
                <Route path="/termos-de-uso" element={<TermosDeUso />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route path="/regulamento-mmn" element={<RegulamentoMMN />} />
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
