import { Home, Users as UsersIcon, DollarSign, LogOut, Shield, KeyRound, FlaskConical, Smartphone } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEnvironment } from "@/contexts/EnvironmentContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface User {
  id: string;
  full_name: string;
  status: string;
}

interface DashboardSidebarProps {
  user: User;
}

const menuItems = [
  { title: "Início", url: "/dashboard", icon: Home },
  { title: "SIM CARD e eSIM", url: "/sim-activation", icon: Smartphone },
  { title: "Minha Rede", url: "/network", icon: UsersIcon },
  { title: "Financeiro", url: "/financial", icon: DollarSign },
  { title: "Trocar Senha", url: "/change-password", icon: KeyRound },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const { open } = useSidebar();
  const { signOut } = useAuth();
  const { environment, setEnvironment, isSandbox } = useEnvironment();
  const { impersonatedUser, setImpersonatedUser, isImpersonating } = useImpersonation();

  // Verificar se o usuário é admin
  const { data: isAdmin } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    },
  });

  const handleEnvironmentToggle = (checked: boolean) => {
    setEnvironment(checked ? "sandbox" : "production");
  };

  const handleStopImpersonation = () => {
    setImpersonatedUser(null);
    window.location.reload();
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <div className="space-y-1">
            <SidebarGroupLabel>Y-TECH 5G</SidebarGroupLabel>
            {isSandbox && open && (
              <div className="px-3 pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-orange-500">
                  <FlaskConical className="h-3 w-3" />
                  <span>AMBIENTE SANDBOX</span>
                </div>
              </div>
            )}
            {isImpersonating && open && (
              <div className="px-3 pb-2">
                <Badge variant="secondary" className="w-full justify-center text-xs">
                  Acessando como: {impersonatedUser?.full_name}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStopImpersonation}
                  className="w-full mt-2 text-xs"
                >
                  Voltar ao Admin
                </Button>
              </div>
            )}
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        isActive ? "bg-accent text-accent-foreground" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/users"
                        className={({ isActive }) =>
                          isActive ? "bg-accent text-accent-foreground" : ""
                        }
                      >
                        <UsersIcon className="h-4 w-4" />
                        {open && <span>Usuários</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to="/admin"
                        className={({ isActive }) =>
                          isActive ? "bg-accent text-accent-foreground" : ""
                        }
                      >
                        <Shield className="h-4 w-4" />
                        {open && <span>Admin</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {/* Seletor de Ambiente (apenas para admins) */}
                  <SidebarMenuItem>
                    <div className="px-2 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-orange-500" />
                          {open && (
                            <Label htmlFor="sandbox-mode" className="text-xs cursor-pointer">
                              Modo Sandbox
                            </Label>
                          )}
                        </div>
                        <Switch
                          id="sandbox-mode"
                          checked={isSandbox}
                          onCheckedChange={handleEnvironmentToggle}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>
                    </div>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  {open && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
