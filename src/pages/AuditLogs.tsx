import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Loader2, Shield, Search, KeyRound, User, DollarSign, Calendar, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuditLog {
  id: string;
  admin_id: string;
  target_user_id: string;
  action_type: string;
  action_details: Record<string, unknown>;
  user_agent: string | null;
  created_at: string;
  admin_profile?: {
    full_name: string;
  };
  target_profile?: {
    full_name: string;
  };
}

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  password_reset: {
    label: "Reset de Senha",
    icon: <KeyRound className="h-4 w-4" />,
    color: "bg-red-500/10 text-red-500",
  },
  username_update: {
    label: "Alteração de Username",
    icon: <User className="h-4 w-4" />,
    color: "bg-blue-500/10 text-blue-500",
  },
  user_activation: {
    label: "Ativação de Usuário",
    icon: <User className="h-4 w-4" />,
    color: "bg-green-500/10 text-green-500",
  },
  balance_adjustment: {
    label: "Ajuste de Saldo",
    icon: <DollarSign className="h-4 w-4" />,
    color: "bg-yellow-500/10 text-yellow-500",
  },
  renewal_date_update: {
    label: "Alteração de Renovação",
    icon: <Calendar className="h-4 w-4" />,
    color: "bg-purple-500/10 text-purple-500",
  },
};

const AuditLogs = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  // Check if user is admin
  const { data: isAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch audit logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", filterAction],
    queryFn: async () => {
      let query = supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterAction !== "all") {
        query = query.eq("action_type", filterAction);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for admin and target users
      if (data && data.length > 0) {
        const adminIds = [...new Set(data.map((l) => l.admin_id))];
        const targetIds = [...new Set(data.map((l) => l.target_user_id))];
        const allIds = [...new Set([...adminIds, ...targetIds])];

        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", allIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        return data.map((log) => ({
          ...log,
          admin_profile: profileMap.get(log.admin_id),
          target_profile: profileMap.get(log.target_user_id),
        })) as AuditLog[];
      }

      return data as AuditLog[];
    },
    enabled: isAdmin === true,
  });

  const filteredLogs = logs?.filter((log) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.admin_profile?.full_name?.toLowerCase().includes(searchLower) ||
      log.target_profile?.full_name?.toLowerCase().includes(searchLower) ||
      log.action_type.toLowerCase().includes(searchLower)
    );
  });

  const formatDetails = (actionType: string, details: Record<string, unknown>) => {
    switch (actionType) {
      case "password_reset":
        return details.send_whatsapp ? "WhatsApp enviado" : "Sem notificação";
      case "username_update":
        return `${details.old_username || "(vazio)"} → ${details.new_username}`;
      case "user_activation":
        return `Plano: ${details.plan_name} - R$ ${details.plan_price}`;
      case "balance_adjustment":
        return `${details.type === "add" ? "+" : "-"}R$ ${details.amount} (${details.reason || "Sem motivo"})`;
      case "renewal_date_update":
        return `Nova data: ${details.new_renewal_date}`;
      default:
        return JSON.stringify(details);
    }
  };

  if (checkingAdmin) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground">
              Apenas administradores podem visualizar os logs de auditoria.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <div>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                Histórico de todas as ações administrativas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="password_reset">Reset de Senha</SelectItem>
                <SelectItem value="username_update">Alteração de Username</SelectItem>
                <SelectItem value="user_activation">Ativação de Usuário</SelectItem>
                <SelectItem value="balance_adjustment">Ajuste de Saldo</SelectItem>
                <SelectItem value="renewal_date_update">Alteração de Renovação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action_type] || {
                  label: log.action_type,
                  icon: <FileText className="h-4 w-4" />,
                  color: "bg-gray-500/10 text-gray-500",
                };

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-full ${actionInfo.color}`}>
                      {actionInfo.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={actionInfo.color}>
                          {actionInfo.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="mt-1">
                        <span className="font-medium">
                          {log.admin_profile?.full_name || "Admin"}
                        </span>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-medium">
                          {log.target_profile?.full_name || "Usuário"}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDetails(log.action_type, log.action_details as Record<string, unknown>)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log de auditoria encontrado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default AuditLogs;
