import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { PlanSelector } from "./PlanSelector";
import { useAuth } from "@/contexts/AuthContext";

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading } = useAuth();
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      navigate("/login");
      return;
    }

    // Se pending_payment E não está em checkout/payment, forçar seleção de plano
    const isCheckoutOrPayment = location.pathname.includes("/checkout") || location.pathname.includes("/payment");
    if (profile.status === "pending_payment" && !isCheckoutOrPayment) {
      setShowPlanSelector(true);
    } else {
      setShowPlanSelector(false);
    }
  }, [profile, loading, navigate, location.pathname]);

  if (loading || !profile) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar user={profile} />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{profile.full_name}</span>
            </div>
          </header>

          <main className="flex-1 p-6">
            {showPlanSelector ? (
              <PlanSelector onPlanSelected={() => setShowPlanSelector(false)} userId={profile.id} />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
