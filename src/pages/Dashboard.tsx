import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Share2, Loader2, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UsernameManager } from "@/components/UsernameManager";
import { useAuth } from "@/contexts/AuthContext";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Dashboard = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCommissions: 0,
    availableBalance: 0,
  });

  useEffect(() => {
    if (!profile?.id) return;

    loadStats();

    // Escutar por novas comissões em tempo real
    const channel = supabase
      .channel('commissions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commissions',
          filter: `user_id=eq.${profile.id}`
        },
        (payload) => {
          console.log('Nova comissão recebida!', payload);
          loadStats();
          toast({
            title: "Nova comissão recebida!",
            description: `Você recebeu R$ ${Number(payload.new.amount).toFixed(2)} de comissão`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const loadStats = async () => {
    if (!profile?.id) return;

    try {
      // Buscar total de indicações (toda a rede)
      const { data: networkData, error: networkError } = await supabase
        .from("user_network")
        .select("id")
        .contains("path", [profile.id])
        .neq("user_id", profile.id);

      if (networkError) throw networkError;

      // Buscar comissões totais
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("commissions")
        .select("amount, status")
        .eq("user_id", profile.id);

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
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel de controle</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card 
            className="backdrop-blur-xl bg-[hsl(var(--glass-yellow))]/20 border-[hsl(var(--glass-yellow))]/30 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/rede')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-yellow-foreground))]">Total de Indicações</CardTitle>
              <Users className="h-5 w-5 text-[hsl(var(--glass-yellow-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--glass-yellow-foreground))]">{stats.totalReferrals}</div>
              <p className="text-xs text-[hsl(var(--glass-yellow-foreground))]/70 mt-1">
                {stats.totalReferrals === 0 ? "Nenhuma indicação ainda" : "Em toda sua rede"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="backdrop-blur-xl bg-[hsl(var(--glass-blue))]/20 border-[hsl(var(--glass-blue))]/30 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/financeiro')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-blue-foreground))]">Comissões Totais</CardTitle>
              <DollarSign className="h-5 w-5 text-[hsl(var(--glass-blue-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--glass-blue-foreground))]">
                R$ {stats.totalCommissions.toFixed(2).replace(".", ",")}
              </div>
              <p className="text-xs text-[hsl(var(--glass-blue-foreground))]/70 mt-1">
                {stats.totalCommissions === 0 ? "Aguardando indicações" : "Acumulado"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="backdrop-blur-xl bg-[hsl(var(--glass-green))]/20 border-[hsl(var(--glass-green))]/30 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/financeiro')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-green-foreground))]">Disponível para Saque</CardTitle>
              <TrendingUp className="h-5 w-5 text-[hsl(var(--glass-green-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--glass-green-foreground))]">
                R$ {stats.availableBalance.toFixed(2).replace(".", ",")}
              </div>
              <p className="text-xs text-[hsl(var(--glass-green-foreground))]/70 mt-1">
                {stats.availableBalance === 0 ? "Sem saldo disponível" : "Pronto para saque"}
              </p>
            </CardContent>
          </Card>

          <Card 
            className="backdrop-blur-xl bg-[hsl(var(--glass-purple))]/20 border-[hsl(var(--glass-purple))]/30 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => navigate('/rede')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[hsl(var(--glass-purple-foreground))]">Rede MMN</CardTitle>
              <Share2 className="h-5 w-5 text-[hsl(var(--glass-purple-foreground))]/70" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[hsl(var(--glass-purple-foreground))]">4 níveis</div>
              <p className="text-xs text-[hsl(var(--glass-purple-foreground))]/70 mt-1">Sistema ativo</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seu Username</CardTitle>
            <CardDescription>
              Escolha um username único para seu link de indicação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsernameManager
              userId={profile.id}
              currentUsername={profile.username || null}
              onUsernameUpdate={refreshProfile}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seu Link de Indicação</CardTitle>
            <CardDescription>
              Compartilhe este link ou QR Code para convidar novos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={
                  profile.username
                    ? `https://ytech.yrwentechnology.com.br/cadastro?ref=${profile.username}`
                    : `https://ytech.yrwentechnology.com.br/cadastro?ref=${profile.id}`
                }
                className="flex-1 px-4 py-2 border rounded-md bg-muted"
              />
              <button
                onClick={() => {
                  const link = profile.username
                    ? `https://ytech.yrwentechnology.com.br/cadastro?ref=${profile.username}`
                    : `https://ytech.yrwentechnology.com.br/cadastro?ref=${profile.id}`;
                  navigator.clipboard.writeText(link);
                  toast({
                    title: "Link copiado!",
                    description: "O link foi copiado para a área de transferência",
                  });
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Copiar
              </button>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 flex items-center gap-2">
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>QR Code de Indicação</DialogTitle>
                    <DialogDescription>
                      Mostre este QR Code para seu indicado escanear
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center p-6">
                    <QRCodeSVG
                      value={
                        profile.username
                          ? `https://ytech.yrwentechnology.com.br/cadastro?ref=${profile.username}`
                          : `https://ytech.yrwentechnology.com.br/cadastro?ref=${profile.id}`
                      }
                      size={256}
                      level="H"
                      includeMargin
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
