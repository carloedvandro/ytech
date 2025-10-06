import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { PlanSelector } from "./PlanSelector";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  full_name: string;
  email: string;
  status: string;
  whatsapp: string;
  cpf: string;
}

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const sessionData = localStorage.getItem("user_session");
      if (!sessionData) {
        navigate("/login");
        return;
      }

      const localUser = JSON.parse(sessionData);
      
      // Buscar dados atualizados do banco
      const { data: updatedUser } = await supabase
        .from("users")
        .select("*")
        .eq("id", localUser.id)
        .single();

      if (updatedUser) {
        localStorage.setItem("user_session", JSON.stringify(updatedUser));
        setUser(updatedUser);

        // Se pending_payment E não está em checkout/payment, forçar seleção de plano
        const isCheckoutOrPayment = location.pathname.includes("/checkout") || location.pathname.includes("/payment");
        if (updatedUser.status === "pending_payment" && !isCheckoutOrPayment) {
          setShowPlanSelector(true);
        } else {
          setShowPlanSelector(false);
        }
      } else {
        setUser(localUser);
      }
    };

    loadUser();
  }, [navigate, location.pathname]);

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar user={user} />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b bg-background flex items-center px-4 gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
            <div className="text-sm text-muted-foreground">
              Olá, <span className="font-medium text-foreground">{user.full_name}</span>
            </div>
          </header>

          <main className="flex-1 p-6">
            {showPlanSelector ? (
              <PlanSelector onPlanSelected={() => setShowPlanSelector(false)} userId={user.id} />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
