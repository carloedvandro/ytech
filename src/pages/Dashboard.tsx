import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Share2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCommissions: 0,
    availableBalance: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user_session") || "{}");

      // Buscar total de indicações (toda a rede)
      const { data: networkData, error: networkError } = await supabase
        .from("user_network")
        .select("id", { count: "exact", head: true })
        .contains("path", [userData.id])
        .neq("user_id", userData.id);

      if (networkError) throw networkError;

      // Buscar comissões totais
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("commissions")
        .select("amount, status")
        .eq("user_id", userData.id);

      if (commissionsError) throw commissionsError;

      const totalCommissions = commissionsData?.reduce(
        (sum, comm) => sum + Number(comm.amount),
        0
      ) || 0;

      const availableBalance = commissionsData
        ?.filter((comm) => comm.status === "available")
        .reduce((sum, comm) => sum + Number(comm.amount), 0) || 0;

      setStats({
        totalReferrals: networkData?.length || 0,
        totalCommissions,
        availableBalance,
      });
    } catch (error: any) {
      console.error("Erro ao carregar estatísticas:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel de controle</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Indicações</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalReferrals === 0 ? "Nenhuma indicação ainda" : "Em toda sua rede"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões Totais</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.totalCommissions.toFixed(2).replace(".", ",")}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.totalCommissions === 0 ? "Aguardando indicações" : "Acumulado"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disponível para Saque</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.availableBalance.toFixed(2).replace(".", ",")}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.availableBalance === 0 ? "Sem saldo disponível" : "Pronto para saque"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rede MLM</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4 níveis</div>
              <p className="text-xs text-muted-foreground">Sistema ativo</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seu Link de Indicação</CardTitle>
            <CardDescription>
              Compartilhe este link para convidar novos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`https://ytech.yrwentechnology.com.br/cadastro?ref=${JSON.parse(localStorage.getItem("user_session") || "{}").id}`}
                className="flex-1 px-4 py-2 border rounded-md bg-muted"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `https://ytech.yrwentechnology.com.br/cadastro?ref=${JSON.parse(localStorage.getItem("user_session") || "{}").id}`
                  );
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Copiar
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
