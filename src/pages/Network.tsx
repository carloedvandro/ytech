import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Users, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

interface NetworkUser {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  level: number;
}

const Network = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [network, setNetwork] = useState<NetworkUser[]>([]);
  const [stats, setStats] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    total: 0,
  });

  useEffect(() => {
    loadNetwork();
  }, []);

  const loadNetwork = async () => {
    try {
      if (!user?.id) return;

      // Buscar TODA a rede do usuário (não só indicados diretos)
      const { data: networkData, error: networkError } = await supabase
        .from("user_network")
        .select(`
          level,
          user_id,
          path,
          profiles!user_network_user_id_fkey (
            id,
            full_name,
            cpf,
            whatsapp,
            status,
            created_at
          )
        `)
        .contains("path", [user.id])
        .neq("user_id", user.id) // Excluir o próprio usuário
        .order("level", { ascending: true });

      if (networkError) throw networkError;

      // Buscar o nível do usuário logado para calcular níveis relativos
      const { data: myLevel } = await supabase
        .from("user_network")
        .select("level")
        .eq("user_id", user.id)
        .maybeSingle();

      const userLevel = myLevel?.level || 1;

      // Buscar emails dos usuários da auth
      const { data: authUsersData } = await supabase.auth.admin.listUsers();
      
      const emailMap = new Map<string, string>();
      if (authUsersData?.users) {
        authUsersData.users.forEach(u => {
          if (u.id && u.email) {
            emailMap.set(u.id, u.email);
          }
        });
      }

      const formattedNetwork = networkData?.map((item: any) => ({
        ...item.profiles,
        email: emailMap.get(item.user_id) || 'N/A',
        level: item.level - userLevel, // Calcular nível relativo
      })) || [];

      setNetwork(formattedNetwork);

      // Calcular estatísticas
      const statsData = {
        level1: formattedNetwork.filter((u: NetworkUser) => u.level === 1).length,
        level2: formattedNetwork.filter((u: NetworkUser) => u.level === 2).length,
        level3: formattedNetwork.filter((u: NetworkUser) => u.level === 3).length,
        level4: formattedNetwork.filter((u: NetworkUser) => u.level === 4).length,
        total: formattedNetwork.length,
      };

      setStats(statsData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar rede",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "text-primary";
      case 2: return "text-secondary";
      case 3: return "text-accent";
      case 4: return "text-muted-foreground";
      default: return "text-foreground";
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
          <h1 className="text-3xl font-bold">Minha Rede MMN</h1>
          <p className="text-muted-foreground">
            Visualize todos os usuários da sua rede em 4 níveis
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nível 1</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.level1}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nível 2</CardTitle>
              <Users className="h-4 w-4 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.level2}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nível 3</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{stats.level3}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nível 4</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.level4}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuários da Rede</CardTitle>
            <CardDescription>
              Todos os usuários indicados direta ou indiretamente por você
            </CardDescription>
          </CardHeader>
          <CardContent>
            {network.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Você ainda não possui usuários na sua rede
              </p>
            ) : (
              <div className="space-y-4">
                {network.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${getLevelColor(user.level)}`}>
                        Nível {user.level}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Network;
