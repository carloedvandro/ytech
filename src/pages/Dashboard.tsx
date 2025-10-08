import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Share2, Loader2, QrCode, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UsernameManager } from "@/components/UsernameManager";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MarketingMaterialGenerator } from "@/components/marketing/MarketingMaterialGenerator";
import { ExternalLink } from "lucide-react";
import { AnimatedGradient } from "@/components/ui/animated-gradient-with-svg";

const Dashboard = () => {
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showTypeSelectionDialog, setShowTypeSelectionDialog] = useState(false);
  const [userConfirmedActivation, setUserConfirmedActivation] = useState(false);

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

  // Buscar status da ativação de SIM
  const { data: simActivation, refetch: refetchActivations } = useQuery({
    queryKey: ["sim-activation-status", activeProfile?.id],
    queryFn: async () => {
      if (!activeProfile?.id) return null;
      
      const { data, error } = await supabase
        .from("sim_activations")
        .select("*")
        .eq("user_id", activeProfile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar ativação:", error);
        return null;
      }
      
      return data;
    },
    enabled: !!activeProfile?.id,
  });

  // Carregar confirmação do localStorage (DEPOIS de simActivation ser definido)
  useEffect(() => {
    if (simActivation?.id) {
      const confirmed = localStorage.getItem(`activation-confirmed-${simActivation.id}`);
      setUserConfirmedActivation(confirmed === 'true');
    } else {
      setUserConfirmedActivation(false);
    }
  }, [simActivation?.id]);

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
          toast.success(`Nova comissão recebida! R$ ${Number(payload.new.amount).toFixed(2)}`);
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
      toast.error(`Erro ao carregar dados: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmActivation = async () => {
    try {
      // Enviar notificação WhatsApp para administradores
      const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
        body: {
          messageType: 'chip_activated_by_user',
          userId: activeProfile?.id,
          userName: activeProfile?.full_name || 'Cliente',
          userWhatsapp: activeProfile?.whatsapp
        }
      });

      if (error) {
        console.error('Erro ao enviar notificação:', error);
        toast.error("Erro ao enviar notificação, mas continuaremos o processo.");
      }

      // Marcar como confirmado
      if (simActivation?.id) {
        localStorage.setItem(`activation-confirmed-${simActivation.id}`, 'true');
        setUserConfirmedActivation(true);
      }

      toast.success("Confirmação enviada com sucesso! Nossa equipe foi notificada.");
      setShowConfirmDialog(false);
      
      // Recarregar dados
      refetchActivations();
    } catch (error) {
      console.error('Erro ao confirmar ativação:', error);
      toast.error("Erro ao enviar confirmação. Tente novamente.");
    }
  };

  const handleDeleteActivation = async () => {
    if (!simActivation) return;

    try {
      const { error } = await supabase
        .from('sim_activations')
        .delete()
        .eq('id', simActivation.id);

      if (error) throw error;

      toast.success("Ativação deletada com sucesso!");
      setShowReactivateDialog(false);
      setShowTypeSelectionDialog(true);
      refetchActivations();
    } catch (error) {
      console.error('Erro ao deletar ativação:', error);
      toast.error("Erro ao deletar ativação. Tente novamente.");
    }
  };

  const handleSelectActivationType = (type: 'sim' | 'esim') => {
    setShowTypeSelectionDialog(false);
    navigate('/sim-activation', { state: { activationType: type, isReactivation: true } });
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

        {/* Status da Ativação do SIM */}
        {simActivation && (
          <Card className="relative overflow-hidden border-2">
            {simActivation.status === "activated" ? (
              <>
                <AnimatedGradient colors={["#10b981", "#34d399", "#6ee7b7"]} speed={0.08} blur="heavy" />
                <div className="relative z-10 p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                        🎉 Chip Ativado com Sucesso!
                      </h3>
                      <p className="text-muted-foreground mt-1">
                        Seu chip foi ativado em {new Date(simActivation.activated_at!).toLocaleString('pt-BR')}
                      </p>
                      {simActivation.qr_code_url && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="mt-3">
                              <QrCode className="h-4 w-4 mr-2" />
                              Ver QR Code do eSIM
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>QR Code do eSIM</DialogTitle>
                              <DialogDescription>
                                Use este QR code para ativar seu eSIM no dispositivo
                              </DialogDescription>
                            </DialogHeader>
                            <div className="flex justify-center p-6">
                              <QRCodeSVG
                                value={simActivation.qr_code_url}
                                size={256}
                                level="H"
                                includeMargin
                              />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <AnimatedGradient colors={["#f59e0b", "#fbbf24", "#fcd34d"]} speed={0.08} blur="heavy" />
                <div className="relative z-10 p-6">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        ⏳ Ativação Pendente
                      </h3>
                      <p className="text-muted-foreground mt-1">
                        Sua solicitação foi enviada em {new Date(simActivation.created_at).toLocaleString('pt-BR')}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Aguarde a confirmação da nossa equipe. Você será notificado assim que seu chip for ativado.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        )}

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

        {/* Exibir QR Code do eSIM quando ativado */}
        {simActivation?.status === "activated" && simActivation?.activation_type === "esim" && simActivation?.qr_code_url && (
          <Card className="relative overflow-hidden backdrop-blur-xl bg-background/50 border-green-500/30">
            <AnimatedGradient colors={["#10b981", "#34d399", "#6ee7b7"]} speed={0.05} blur="medium" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Seu eSIM foi Ativado!
              </CardTitle>
              <CardDescription>
                Escaneie o QR Code abaixo para configurar seu eSIM
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 flex flex-col items-center gap-4">
              <div className="relative p-4 bg-white rounded-lg">
                <img 
                  src={simActivation.qr_code_url} 
                  alt="QR Code do eSIM" 
                  className="max-w-[300px] w-full h-auto"
                />
                {userConfirmedActivation && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/95 rounded-lg">
                    <div className="text-center">
                      <CheckCircle2 className="h-16 w-16 text-white mx-auto mb-2" />
                      <p className="text-2xl font-bold text-white">eSIM ATIVO</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="text-sm text-center space-y-2">
                <p className="font-medium">📱 Como configurar:</p>
                <ol className="text-left space-y-1 text-muted-foreground">
                  <li>1️⃣ Vá em Configurações → Celular → Adicionar eSIM</li>
                  <li>2️⃣ Escolha "Usar QR Code"</li>
                  <li>3️⃣ Escaneie o código acima</li>
                  <li>4️⃣ Aguarde a ativação (pode levar alguns minutos)</li>
                </ol>
              </div>
              <Button
                variant="outline"
                onClick={() => window.open(simActivation.qr_code_url, '_blank')}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir imagem em nova aba
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    className="w-full" 
                    variant="default"
                    disabled={userConfirmedActivation}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {userConfirmedActivation ? "Confirmação já enviada ✓" : "Já li o QR Code e meu chip foi ativado"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Ativação do Chip</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                      <p>Tem certeza que deseja enviar a confirmação?</p>
                      <p className="font-semibold">Você já fez os testes de conexão?</p>
                      <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                        <li>Abriu o navegador</li>
                        <li>Acessou qualquer site</li>
                        <li>Fez uma chamada de teste (Se tiver contratado)</li>
                      </ul>
                      <p className="text-sm mt-2">Se sim, aperte em continuar para notificar nossa equipe.</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          const { error } = await supabase.functions.invoke('send-whatsapp-notification', {
                            body: {
                              messageType: 'chip_activated_by_user',
                              data: {
                                fullName: profile?.full_name,
                                whatsapp: profile?.whatsapp,
                                activationType: simActivation.activation_type,
                              },
                            },
                          });

                          if (error) throw error;

                          toast.success("Confirmação enviada! Nossa equipe foi notificada sobre a ativação do seu chip.");
                        } catch (error) {
                          console.error('Erro ao enviar confirmação:', error);
                          toast.error("Erro ao enviar confirmação. Tente novamente mais tarde.");
                        }
                      }}
                    >
                      Continuar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full mt-4">
                    Perdi meu aparelho ou troquei de aparelho - Preciso ativar novamente
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reativar Chip</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p className="font-semibold">Atenção! Esta ação irá:</p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Deletar sua ativação atual (QR Code)</li>
                        <li>Permitir que você solicite uma nova ativação</li>
                      </ul>
                      <p className="text-sm mt-3 font-semibold text-orange-600 dark:text-orange-400">
                        ⚠️ Importante:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Se perdeu o celular, certifique-se de desabilitar o eSIM antigo se possível</li>
                        <li>Se trocou de aparelho, remova o eSIM do aparelho antigo antes de ativar no novo</li>
                        <li>Cada eSIM só pode estar ativo em um aparelho por vez</li>
                      </ul>
                      <p className="text-sm mt-2">Tem certeza que deseja continuar?</p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteActivation}>
                      Sim, deletar e reativar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Dialog open={showTypeSelectionDialog} onOpenChange={setShowTypeSelectionDialog}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Como você quer solicitar novamente a ativação?</DialogTitle>
                    <DialogDescription>
                      Escolha o tipo de ativação e siga o processo como se fosse sua primeira ativação.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">📱 Via eSIM (Digital)</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Receba um QR Code para ativar diretamente no seu aparelho. Ideal para aparelhos compatíveis com eSIM.
                      </p>
                      <Button onClick={() => handleSelectActivationType('esim')} className="w-full">
                        Ativar via eSIM
                      </Button>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">💳 Via Chip Físico (SIM Card)</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Tire uma foto do seu chip físico para ativação. Escolha esta opção se seu aparelho não suporta eSIM.
                      </p>
                      <Button onClick={() => handleSelectActivationType('sim')} variant="outline" className="w-full">
                        Ativar via Chip Físico
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
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
                  toast.success("Link copiado para a área de transferência!");
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
                      toast.success("Link do seu mini site foi copiado!");
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
