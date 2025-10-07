import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { PlanSelector } from "./PlanSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading } = useAuth();
  const { isSandbox } = useEnvironment();
  const { impersonatedUser, isImpersonating } = useImpersonation();
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  // Buscar perfil do usuário impersonado se necessário
  const { data: impersonatedProfile } = useQuery({
    queryKey: ["impersonated-profile", impersonatedUser?.id],
    queryFn: async () => {
      if (!impersonatedUser) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", impersonatedUser.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: isImpersonating && !!impersonatedUser,
  });

  // Usar perfil impersonado ou perfil real
  const activeProfile = isImpersonating && impersonatedProfile ? impersonatedProfile : profile;

  useEffect(() => {
    if (loading) return;

    if (!profile) {
      navigate("/login");
      return;
    }

    // Não forçar seleção de plano se estiver impersonando
    if (isImpersonating) {
      setShowPlanSelector(false);
      return;
    }

    // Se pending_payment E não está em checkout/payment, forçar seleção de plano
    const isCheckoutOrPayment = location.pathname.includes("/checkout") || location.pathname.includes("/payment");
    if (profile.status === "pending_payment" && !isCheckoutOrPayment) {
      setShowPlanSelector(true);
    } else {
      setShowPlanSelector(false);
    }
  }, [profile, loading, navigate, location.pathname, isImpersonating]);

  if (loading || !profile || !activeProfile) return null;

  return (
    <SidebarProvider>
      <div className={`min-h-screen flex w-full ${isSandbox ? "ring-4 ring-orange-500" : ""}`}>
        <DashboardSidebar user={profile} />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <ThemeToggle />
            <div className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{activeProfile.full_name}</span>
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
