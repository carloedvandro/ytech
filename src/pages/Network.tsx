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
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
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
            email,
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

      const formattedNetwork = networkData?.map((item: any) => ({
        ...item.profiles,
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
      case 1: return "text-[hsl(var(--glass-yellow-foreground))]";
      case 2: return "text-[hsl(var(--glass-blue-foreground))]";
      case 3: return "text-[hsl(var(--glass-green-foreground))]";
      case 4: return "text-[hsl(var(--glass-purple-foreground))]";
      default: return "text-foreground";
    }
  };

  const getLevelBg = (level: number) => {
    switch (level) {
      case 1: return "backdrop-blur-xl bg-[hsl(var(--glass-yellow))]/20 border-[hsl(var(--glass-yellow))]/30";
      case 2: return "backdrop-blur-xl bg-[hsl(var(--glass-blue))]/20 border-[hsl(var(--glass-blue))]/30";
      case 3: return "backdrop-blur-xl bg-[hsl(var(--glass-green))]/20 border-[hsl(var(--glass-green))]/30";
      case 4: return "backdrop-blur-xl bg-[hsl(var(--glass-purple))]/20 border-[hsl(var(--glass-purple))]/30";
      default: return "";
    }
  };

  const filteredNetwork = selectedLevel 
    ? network.filter(user => user.level === selectedLevel)
    : network;

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
          <Card 
            className={`${getLevelBg(1)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 1 ? 'ring-2 ring-[hsl(var(--glass-yellow-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 1 ? null : 1)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-yellow-foreground))]">Nível 1</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-yellow-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-yellow-foreground))]">{stats.level1}</div>
            </CardContent>
          </Card>

          <Card 
            className={`${getLevelBg(2)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 2 ? 'ring-2 ring-[hsl(var(--glass-blue-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 2 ? null : 2)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-blue-foreground))]">Nível 2</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-blue-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-blue-foreground))]">{stats.level2}</div>
            </CardContent>
          </Card>

          <Card 
            className={`${getLevelBg(3)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 3 ? 'ring-2 ring-[hsl(var(--glass-green-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 3 ? null : 3)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-green-foreground))]">Nível 3</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-green-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-green-foreground))]">{stats.level3}</div>
            </CardContent>
          </Card>

          <Card 
            className={`${getLevelBg(4)} shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${selectedLevel === 4 ? 'ring-2 ring-[hsl(var(--glass-purple-foreground))]' : ''}`}
            onClick={() => setSelectedLevel(selectedLevel === 4 ? null : 4)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-purple-foreground))]">Nível 4</CardTitle>
              <Users className="h-4 w-4 text-[hsl(var(--glass-purple-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[hsl(var(--glass-purple-foreground))]">{stats.level4}</div>
            </CardContent>
          </Card>

          <Card 
            className="backdrop-blur-xl bg-background/50 border shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedLevel(null)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedLevel ? `Usuários do Nível ${selectedLevel}` : "Usuários da Rede"}
            </CardTitle>
            <CardDescription>
              {selectedLevel 
                ? `Mostrando apenas os usuários do nível ${selectedLevel}. Clique no card novamente para ver todos.`
                : "Todos os usuários indicados direta ou indiretamente por você. Clique em um nível para filtrar."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredNetwork.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {selectedLevel 
                  ? `Nenhum usuário no nível ${selectedLevel}`
                  : "Você ainda não possui usuários na sua rede"
                }
              </p>
            ) : (
              <div className="space-y-4">
                {filteredNetwork.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${getLevelBg(user.level)} transition-all duration-300`}
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
