import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Share2, Loader2, QrCode, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UsernameManager } from "@/components/UsernameManager";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MarketingMaterialGenerator } from "@/components/marketing/MarketingMaterialGenerator";
import { ExternalLink } from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg";

const Dashboard = () => {
  const { toast } = useToast();
  const { profile, refreshProfile } = useAuth();
  const { impersonatedUser, isImpersonating } = useImpersonation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCommissions: 0,
    availableBalance: 0,
  });
  const [isOverdue, setIsOverdue] = useState(false);
  const [renewalDate, setRenewalDate] = useState<string | null>(null);

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
    if (!activeProfile?.id) return;

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
          filter: `user_id=eq.${activeProfile.id}`
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
  }, [activeProfile?.id]);

  const loadStats = async () => {
    if (!activeProfile?.id) return;

    try {
      // Buscar total de indicações (toda a rede)
      const { data: networkData, error: networkError } = await supabase
        .from("user_network")
        .select("id")
        .contains("path", [activeProfile.id])
        .neq("user_id", activeProfile.id);

      if (networkError) throw networkError;

      // Buscar comissões totais
      const { data: commissionsData, error: commissionsError } = await supabase
        .from("commissions")
        .select("amount, status")
        .eq("user_id", activeProfile.id);

      if (commissionsError) throw commissionsError;

      // Buscar data de renovação
      const { data: paymentData } = await supabase
        .from("payments")
        .select("next_renewal_date")
        .eq("user_id", activeProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Verificar se está em atraso
      if (paymentData?.next_renewal_date) {
        const renewal = new Date(paymentData.next_renewal_date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        renewal.setHours(0, 0, 0, 0);
        
        setIsOverdue(renewal < now);
        setRenewalDate(paymentData.next_renewal_date);
      } else {
        setIsOverdue(false);
        setRenewalDate(null);
      }

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

  if (!profile || !activeProfile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo ao seu painel de controle</p>
        </div>

        {/* Alerta de pagamento em atraso */}
        {isOverdue && (
          <Alert variant="destructive" className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Pagamento em Atraso</AlertTitle>
            <AlertDescription>
              Sua assinatura está vencida desde {renewalDate ? new Date(renewalDate).toLocaleDateString('pt-BR') : ''}. 
              Você não receberá comissões de novas indicações até regularizar seu pagamento.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={() => navigate('/network')}
            className="cursor-pointer animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <Card className="relative overflow-hidden h-full bg-background/50 backdrop-blur-xl border-[hsl(var(--glass-yellow))]/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <AnimatedGradient colors={["#fbbf24", "#f59e0b", "#d97706"]} speed={0.05} blur="medium" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Total de Indicações</CardTitle>
                <Users className="h-5 w-5 text-foreground/70" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-foreground">{stats.totalReferrals}</div>
                <p className="text-xs text-foreground/70 mt-1">
                  {stats.totalReferrals === 0 ? "Nenhuma indicação ainda" : "Em toda sua rede"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div
            onClick={() => navigate('/financial')}
            className="cursor-pointer animate-fade-in"
            style={{ animationDelay: '0.4s' }}
          >
            <Card className="relative overflow-hidden h-full bg-background/50 backdrop-blur-xl border-[hsl(var(--glass-blue))]/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <AnimatedGradient colors={["#3b82f6", "#60a5fa", "#93c5fd"]} speed={0.05} blur="medium" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Comissões Totais</CardTitle>
                <DollarSign className="h-5 w-5 text-foreground/70" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-foreground">
                  R$ {stats.totalCommissions.toFixed(2).replace(".", ",")}
                </div>
                <p className="text-xs text-foreground/70 mt-1">
                  {stats.totalCommissions === 0 ? "Aguardando indicações" : "Acumulado"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div
            onClick={() => navigate('/financial')}
            className="cursor-pointer animate-fade-in"
            style={{ animationDelay: '0.6s' }}
          >
            <Card className="relative overflow-hidden h-full bg-background/50 backdrop-blur-xl border-[hsl(var(--glass-green))]/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <AnimatedGradient colors={["#10b981", "#34d399", "#6ee7b7"]} speed={0.05} blur="medium" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Disponível para Saque</CardTitle>
                <TrendingUp className="h-5 w-5 text-foreground/70" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-foreground">
                  R$ {stats.availableBalance.toFixed(2).replace(".", ",")}
                </div>
                <p className="text-xs text-foreground/70 mt-1">
                  {stats.availableBalance === 0 ? "Sem saldo disponível" : "Pronto para saque"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div
            onClick={() => navigate('/network')}
            className="cursor-pointer animate-fade-in"
            style={{ animationDelay: '0.8s' }}
          >
            <Card className="relative overflow-hidden h-full bg-background/50 backdrop-blur-xl border-[hsl(var(--glass-purple))]/30 shadow-lg hover:shadow-xl transition-all duration-300">
              <AnimatedGradient colors={["#8b5cf6", "#a78bfa", "#c4b5fd"]} speed={0.05} blur="medium" />
              <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-foreground">Rede MMN</CardTitle>
                <Share2 className="h-5 w-5 text-foreground/70" />
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold text-foreground">4 níveis</div>
                <p className="text-xs text-foreground/70 mt-1">Sistema ativo</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50">
          <AnimatedGradient colors={["#06b6d4", "#22d3ee", "#67e8f9"]} speed={0.05} blur="medium" />
          <CardHeader className="relative z-10">
            <CardTitle>Seu Username</CardTitle>
            <CardDescription>
              Escolha um username único para seu link de indicação
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <UsernameManager
              userId={activeProfile.id}
              currentUsername={activeProfile.username || null}
              onUsernameUpdate={refreshProfile}
            />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50">
          <AnimatedGradient colors={["#f97316", "#fb923c", "#fdba74"]} speed={0.05} blur="medium" />
          <CardHeader className="relative z-10">
            <CardTitle>Seu Link de Indicação</CardTitle>
            <CardDescription>
              Compartilhe este link ou QR Code para convidar novos usuários
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={
                  activeProfile.username
                    ? `https://ytech.yrwentechnology.com.br/cadastro?ref=${activeProfile.username}`
                    : `https://ytech.yrwentechnology.com.br/cadastro?ref=${activeProfile.id}`
                }
                className="flex-1 px-4 py-2 border rounded-md bg-muted"
              />
              <button
                onClick={() => {
                  const link = activeProfile.username
                    ? `https://ytech.yrwentechnology.com.br/cadastro?ref=${activeProfile.username}`
                    : `https://ytech.yrwentechnology.com.br/cadastro?ref=${activeProfile.id}`;
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
                        activeProfile.username
                          ? `https://ytech.yrwentechnology.com.br/cadastro?ref=${activeProfile.username}`
                          : `https://ytech.yrwentechnology.com.br/cadastro?ref=${activeProfile.id}`
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

        {/* Meu Mini Site */}
        <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50">
          <AnimatedGradient colors={["#ec4899", "#f472b6", "#fb923c"]} speed={0.05} blur="medium" />
          <CardHeader className="relative z-10">
            <CardTitle>Meu Mini Site</CardTitle>
            <CardDescription>
              Compartilhe seu site personalizado com todos os planos e seu link de indicação
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            {!activeProfile.username ? (
              <Alert>
                <AlertTitle>Configure seu username primeiro</AlertTitle>
                <AlertDescription>
                  Você precisa configurar um username único para ter acesso ao seu mini site.
                </AlertDescription>
              </Alert>
            ) : activeProfile.status !== 'active' ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Conta inativa</AlertTitle>
                <AlertDescription>
                  Ative sua conta para acessar seu mini site.
                </AlertDescription>
              </Alert>
            ) : isOverdue ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Pagamento em atraso</AlertTitle>
                <AlertDescription>
                  Regularize seu pagamento para continuar usando seu mini site.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://ytech.yrwentechnology.com.br/site/${activeProfile.username}`}
                    className="flex-1 px-4 py-2 border rounded-md bg-muted"
                  />
                  <Button
                    onClick={() => {
                      const link = `https://ytech.yrwentechnology.com.br/site/${activeProfile.username}`;
                      navigator.clipboard.writeText(link);
                      toast({
                        title: "Link copiado!",
                        description: "O link do seu mini site foi copiado",
                      });
                    }}
                  >
                    Copiar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => window.open(`/site/${activeProfile.username}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver Site
                  </Button>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code do Mini Site
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>QR Code do Mini Site</DialogTitle>
                      <DialogDescription>
                        Compartilhe este QR Code para que as pessoas acessem seu site
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center p-6">
                      <QRCodeSVG
                        value={`https://ytech.yrwentechnology.com.br/site/${activeProfile.username}`}
                        size={256}
                        level="H"
                        includeMargin
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </CardContent>
        </Card>

        {/* Material de Divulgação */}
        <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50">
          <AnimatedGradient colors={["#14b8a6", "#2dd4bf", "#5eead4"]} speed={0.05} blur="medium" />
          <CardHeader className="relative z-10">
            <CardTitle>Material de Divulgação</CardTitle>
            <CardDescription>
              Gere materiais personalizados para divulgar seus planos (limite de 5 por dia)
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            {!activeProfile.username ? (
              <Alert>
                <AlertTitle>Configure seu username primeiro</AlertTitle>
                <AlertDescription>
                  Você precisa configurar um username único para gerar materiais.
                </AlertDescription>
              </Alert>
            ) : activeProfile.status !== 'active' ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Conta inativa</AlertTitle>
                <AlertDescription>
                  Ative sua conta para gerar materiais de divulgação.
                </AlertDescription>
              </Alert>
            ) : isOverdue ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Pagamento em atraso</AlertTitle>
                <AlertDescription>
                  Regularize seu pagamento para continuar gerando materiais.
                </AlertDescription>
              </Alert>
            ) : (
              <MarketingMaterialGenerator 
                username={activeProfile.username}
                fullName={activeProfile.full_name}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
