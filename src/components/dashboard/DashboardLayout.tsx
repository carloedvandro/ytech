import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./DashboardSidebar";
import { PlanSelector } from "./PlanSelector";

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
    const sessionData = localStorage.getItem("user_session");
    if (!sessionData) {
      navigate("/login");
      return;
    }

    const userData = JSON.parse(sessionData);
    setUser(userData);

    // Se pending_payment E não está em checkout/payment, forçar seleção de plano
    const isCheckoutOrPayment = location.pathname.includes("/checkout") || location.pathname.includes("/payment");
    if (userData.status === "pending_payment" && !isCheckoutOrPayment) {
      setShowPlanSelector(true);
    } else {
      setShowPlanSelector(false);
    }
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
